"""Render MotionAd fast: only our bridges go through the browser, the ad itself goes through ffmpeg.

    python3 tools/render.py out/draft.mp4 --draft    # half size, 25 fps, no motion blur: about a minute
    python3 tools/render.py out/motion-ad.mp4        # full size, 50 fps, 8-subframe motion blur on the bridges
    python3 tools/render.py out/replay.mp4 --draft --comp=Replay --preview
        --comp: which bridge template (src/templates/catalog.ts); --preview: only the ad's first and
        last 2.5 s, to judge the bridges quickly; --voice=<dir>: another take of the gag's lines

The middle of the film is the brand's ad, untouched: ffmpeg copies it in and draws the yellow
ad progress bar, which is real time instead of a browser screenshot per frame. Audio: our
bridges' sound, the ad's own sound, loudness normalised to -14 LUFS.
"""

import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = Path(__file__).resolve().parent.parent


def run(cmd, **kw):
    print("+", " ".join(str(c) for c in cmd[:7]), "...", flush=True)
    return subprocess.run([str(c) for c in cmd], cwd=ROOT, check=True, **kw)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    draft = "--draft" in sys.argv
    preview = "--preview" in sys.argv
    comp = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--comp=")), "MotionAd")
    voice = next((Path(a.split("=", 1)[1]).resolve() for a in sys.argv if a.startswith("--voice=")), None)
    if voice:  # the gag's timeline is built from public/bridge: swap another take in for this render
        bridge, backup = ROOT / "public" / "bridge", ROOT / "public" / "bridge-backup"
        shutil.move(bridge, backup)
        shutil.copytree(voice, bridge, ignore=shutil.ignore_patterns("preview.wav"))
        try:
            return render(args, draft, preview, comp)
        finally:
            shutil.rmtree(bridge)
            shutil.move(backup, bridge)
    render(args, draft, preview, comp)


def render(args, draft, preview, comp):
    final = Path(args[0] if args else ("out/draft.mp4" if draft else "out/motion-ad.mp4"))
    fps, sub, scale = (25, 1, 0.5) if draft else (50, 8, 1.0)
    w, h = int(1920 * scale), int(1080 * scale)
    PARTS = ROOT / "out" / f"parts-{final.stem}"  # one folder per output, so two renders never share parts

    tl = json.loads(run(["npx", "tsx", "tools/timings.ts", comp], capture_output=True, text=True).stdout)
    a = round(tl["adStart"] * fps)  # output frames [0, a): intro bridge
    b = a + round(tl["adDuration"] * fps)  # [a, b): the ad; [b, total): outro bridge
    total = math.floor(tl["total"] * fps)

    PARTS.mkdir(parents=True, exist_ok=True)
    for p in PARTS.iterdir():
        p.unlink()

    def bridge(name, first, last):
        for attempt in range(2):  # headless Chrome occasionally drops a frame under load; one retry
            try:
                return render_part(name, first, last)
            except subprocess.CalledProcessError:
                if attempt:
                    raise
                print("retrying", name, flush=True)

    def render_part(name, first, last):
        run(["npx", "remotion", "render", "src/index.ts", comp, PARTS / f"{name}.mp4",
             f"--props={json.dumps({'fps': fps * sub})}", f"--frames={first * sub}-{last * sub - 1}",
             f"--scale={scale}", "--concurrency=6", "--crf=18", "--gl=angle", "--log=error", f"--browser-executable={CHROME}"])

    bridge("intro", 0, a)
    bridge("outro", b, total)

    blur = f"tmix=frames={sub},select='eq(mod(n\\,{sub})\\,{sub - 1})'," if sub > 1 else ""
    bar = max(2, round(4 * scale))
    dur = (b - a) / fps
    inputs = ["-i", PARTS / "intro.mp4", "-i", f"public/{tl['adVideo']}", "-i", PARTS / "outro.mp4", "-i", f"public/{tl['adAudio']}"]
    if preview:  # the ad's first and last few seconds only
        cut = 2.5
        src_v = (f"[1:v]fps={fps},split[s0][s1];[s0]trim=0:{cut},setpts=PTS-STARTPTS[h0];"
                 f"[s1]trim={tl['adDuration'] - cut}:{tl['adDuration']},setpts=PTS-STARTPTS[h1];[h0][h1]concat=n=2:v=1:a=0,")
        src_a = (f"[3:a]aresample=48000,asplit[x0][x1];[x0]atrim=0:{cut},asetpts=PTS-STARTPTS[y0];"
                 f"[x1]atrim={tl['adDuration'] - cut}:{tl['adDuration']},asetpts=PTS-STARTPTS[y1];[y0][y1]concat=n=2:v=0:a=1,")
        dur = 2 * cut
    else:
        src_v, src_a = f"[1:v]fps={fps},", "[3:a]aresample=48000,"
    n_ad = round(dur * fps)
    rect = tl.get("adRect")
    if rect:  # the ad plays inside a card of the template's layout: a still of the layout, the ad scaled into it
        rx, ry, rw, rh, rr = (round(rect[k] * scale) for k in ("x", "y", "w", "h", "r"))
        run(["npx", "remotion", "still", "src/index.ts", comp, PARTS / "layout.png", f"--props={json.dumps({'fps': fps * sub})}",
             f"--frame={(a + 2) * sub}", f"--scale={scale}", "--gl=angle", "--log=error", f"--browser-executable={CHROME}"])
        run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"color=black:s={rw}x{rh}", "-frames:v", "1", "-vf",
             f"format=gray,geq=lum='255*lte(hypot(max(max({rr}-X,X-({rw}-1-{rr})),0),max(max({rr}-Y,Y-({rh}-1-{rr})),0)),{rr})'", PARTS / "mask.png"])
        inputs += ["-loop", "1", "-i", PARTS / "mask.png", "-loop", "1", "-i", PARTS / "layout.png"]
        ad_w, ad_h = rw, rh
        place = (f"[ady]format=rgba[adc];[4:v]format=gray,trim=end_frame={n_ad}[m];[adc][m]alphamerge[adr];"
                 f"[5:v]fps={fps},scale={w}:{h},trim=end_frame={n_ad},setpts=N/{fps}/TB[bg];[bg][adr]overlay={rx}:{ry}:shortest=1,format=yuv420p[v1];")
    else:
        ad_w, ad_h = w, h
        place = "[ady]null[v1];"
    graph = (
        f"[0:v]{blur}setpts=N/{fps}/TB[v0];"
        f"{src_v}scale={ad_w}:{ad_h},trim=end_frame={n_ad},setpts=N/{fps}/TB,"
        f"drawbox=x=0:y=ih-{bar}:w=iw:h={bar}:color=white@0.25:t=fill[ad];"
        f"color=c=0xffcc00:s={ad_w}x{bar}:r={fps}:d={dur}[y];"
        f"[ad][y]overlay=x='-W+W*t/{dur}':y=H-{bar}:shortest=1[ady];"
        f"{place}"
        f"[2:v]{blur}setpts=N/{fps}/TB[v2];"
        f"[v0][v1][v2]concat=n=3:v=1:a=0[v];"
        f"[0:a]apad,atrim=0:{a / fps},asetpts=N/SR/TB[a0];"
        f"{src_a}apad,atrim=0:{dur},asetpts=N/SR/TB[a1];"
        f"[2:a]apad,atrim=0:{(total - b) / fps},asetpts=N/SR/TB[a2];"
        f"[a0][a1][a2]concat=n=3:v=0:a=1,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
    )
    run(["ffmpeg", "-loglevel", "error", "-y", *inputs,
         "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-r", fps,
         "-c:v", "libx264", "-preset", "veryfast" if draft else "medium", "-crf", 23 if draft else 17, "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", final])
    for p in PARTS.iterdir():
        p.unlink()
    PARTS.rmdir()
    print("done:", final)


if __name__ == "__main__":
    main()
