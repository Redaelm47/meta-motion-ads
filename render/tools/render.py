"""Render MotionAd fast: only our bridges go through the browser, the ad itself goes through ffmpeg.

    python3 tools/render.py out/draft.mp4 --draft    # half size, 25 fps, no motion blur: about a minute
    python3 tools/render.py out/motion-ad.mp4        # full size, 50 fps, 8-subframe motion blur on the bridges

The middle of the film is the brand's ad, untouched: ffmpeg copies it in and draws the yellow
ad progress bar, which is real time instead of a browser screenshot per frame. Audio: our
bridges' sound, the ad's own sound, loudness normalised to -14 LUFS.
"""

import json
import math
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
    final = Path(args[0] if args else ("out/draft.mp4" if draft else "out/motion-ad.mp4"))
    fps, sub, scale = (25, 1, 0.5) if draft else (50, 8, 1.0)
    w, h = int(1920 * scale), int(1080 * scale)
    PARTS = ROOT / "out" / f"parts-{final.stem}"  # one folder per output, so two renders never share parts

    tl = json.loads(run(["npx", "tsx", "tools/timings.ts"], capture_output=True, text=True).stdout)
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
        run(["npx", "remotion", "render", "src/index.ts", "MotionAd", PARTS / f"{name}.mp4",
             f"--props={json.dumps({'fps': fps * sub})}", f"--frames={first * sub}-{last * sub - 1}",
             f"--scale={scale}", "--concurrency=8", "--crf=18", "--log=error", f"--browser-executable={CHROME}"])

    bridge("intro", 0, a)
    bridge("outro", b, total)

    blur = f"tmix=frames={sub},select='eq(mod(n\\,{sub})\\,{sub - 1})'," if sub > 1 else ""
    bar = max(2, round(4 * scale))
    dur = (b - a) / fps
    graph = (
        f"[0:v]{blur}setpts=N/{fps}/TB[v0];"
        f"[1:v]fps={fps},scale={w}:{h},trim=end_frame={b - a},setpts=N/{fps}/TB,"
        f"drawbox=x=0:y=ih-{bar}:w=iw:h={bar}:color=white@0.25:t=fill[ad];"
        f"color=c=0xffcc00:s={w}x{bar}:r={fps}:d={dur}[y];"
        f"[ad][y]overlay=x='-W+W*t/{dur}':y=H-{bar}:shortest=1[v1];"
        f"[2:v]{blur}setpts=N/{fps}/TB[v2];"
        f"[v0][v1][v2]concat=n=3:v=1:a=0[v];"
        f"[0:a]apad,atrim=0:{a / fps},asetpts=N/SR/TB[a0];"
        f"[3:a]aresample=48000,apad,atrim=0:{dur},asetpts=N/SR/TB[a1];"
        f"[2:a]apad,atrim=0:{(total - b) / fps},asetpts=N/SR/TB[a2];"
        f"[a0][a1][a2]concat=n=3:v=0:a=1,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
    )
    run(["ffmpeg", "-loglevel", "error", "-y",
         "-i", PARTS / "intro.mp4", "-i", f"public/{tl['adVideo']}", "-i", PARTS / "outro.mp4", "-i", f"public/{tl['adAudio']}",
         "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-r", fps,
         "-c:v", "libx264", "-preset", "veryfast" if draft else "medium", "-crf", 23 if draft else 17, "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", final])
    for p in PARTS.iterdir():
        p.unlink()
    PARTS.rmdir()
    print("done:", final)


if __name__ == "__main__":
    main()
