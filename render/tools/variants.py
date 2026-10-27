"""Quick drafts of the intro bridge, one per detail/sound variant, to compare side by side.

    python3 tools/variants.py            # all variants
    python3 tools/variants.py bubbles    # just one

Each draft runs from the start to 1.5 s into the ad (half size, 25 fps, no motion blur), with the
ad's own sound under its first seconds. Output: out/variants/<variant>.mp4
"""

import json
import subprocess
import sys
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = Path(__file__).resolve().parent.parent
NAMES = ["cinema", "bubbles"]
FPS = 25


def main():
    names = sys.argv[1:] or NAMES
    tl = json.loads(subprocess.run(["npx", "tsx", "tools/timings.ts"], cwd=ROOT, check=True, capture_output=True, text=True).stdout)
    end = round((tl["adStart"] + 1.5) * FPS)
    out = ROOT / "out" / "variants"
    out.mkdir(parents=True, exist_ok=True)
    for name in names:
        raw = out / f"{name}-raw.mp4"
        subprocess.run(["npx", "remotion", "render", "src/index.ts", "MotionAd", raw, f"--props={json.dumps({'fps': FPS, 'variant': name})}",
                        f"--frames=0-{end - 1}", "--scale=0.5", "--concurrency=8", "--gl=angle", "--log=error", f"--browser-executable={CHROME}"],
                       cwd=ROOT, check=True)
        delay = int(tl["adStart"] * 1000)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-i", f"public/{tl['adAudio']}",
                        "-filter_complex", f"[1:a]atrim=0:1.5,adelay={delay}|{delay}[ad];[0:a][ad]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5[a]",
                        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", out / f"{name}.mp4"], cwd=ROOT, check=True)
        raw.unlink()
        print("done:", out / f"{name}.mp4", flush=True)


if __name__ == "__main__":
    main()
