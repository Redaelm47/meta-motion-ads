"""Final render of MotionAd with motion blur only where things move fast.

The ad in the middle plays as is; our bridges in and out are rendered with 8 subframes per
frame and blended. The three parts are cut at frame boundaries and joined, audio from the
plain render, loudness normalised to -14 LUFS.

    python3 tools/render.py out/motion-ad-v3.mp4
"""

import json
import math
import subprocess
import sys
from pathlib import Path

FPS = 50
SUB = 8
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out" / "parts"


def run(cmd):
    print("+", " ".join(str(c) for c in cmd[:6]), "...", flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


def remotion(out, fps, frames=None, crf=None):
    if Path(out).exists():  # parts survive a failed run; delete out/parts to start over
        print("= reuse", out)
        return
    cmd = ["npx", "remotion", "render", "src/index.ts", "MotionAd", str(out), f"--props={json.dumps({'fps': fps})}",
           "--log=error", f"--browser-executable={CHROME}"]
    if frames:
        cmd.append(f"--frames={frames[0]}-{frames[1]}")
    if crf:
        cmd.append(f"--crf={crf}")
    run(cmd)


def main():
    final = Path(sys.argv[1] if len(sys.argv) > 1 else "out/motion-ad-v3.mp4")
    OUT.mkdir(parents=True, exist_ok=True)
    tl = json.loads(subprocess.run(["npx", "tsx", "tools/timings.ts"], cwd=ROOT, check=True, capture_output=True, text=True).stdout)
    total = math.floor(tl["total"] * FPS)  # whole frames only, so every output frame has all its subframes
    (a0, a1), (b0, b1) = tl["blur"]
    intro_end = math.ceil(a1 * FPS)  # output frames [0, intro_end) come from the blurred intro
    outro_start = math.floor(b0 * FPS)  # output frames [outro_start, total) from the blurred outro

    remotion(OUT / "base.mp4", FPS, crf=16)
    remotion(OUT / "intro.mp4", FPS * SUB, frames=(0, intro_end * SUB - 1), crf=20)
    remotion(OUT / "outro.mp4", FPS * SUB, frames=(outro_start * SUB, total * SUB - 1), crf=20)

    # Each output frame k averages subframes 8k .. 8k+7.
    blur = f"tmix=frames={SUB},select='eq(mod(n\\,{SUB})\\,{SUB - 1})',setpts=N/{FPS}/TB"
    graph = (
        f"[0:v]{blur}[a];"
        f"[1:v]trim=start_frame={intro_end}:end_frame={outro_start},setpts=N/{FPS}/TB[b];"
        f"[2:v]{blur}[c];"
        f"[a][b][c]concat=n=3:v=1:a=0[v]"
    )
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", OUT / "intro.mp4", "-i", OUT / "base.mp4", "-i", OUT / "outro.mp4",
         "-filter_complex", graph, "-map", "[v]", "-map", "1:a", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
         "-r", str(FPS), "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", final])
    for p in OUT.iterdir():
        p.unlink()
    print("done:", final)


if __name__ == "__main__":
    main()
