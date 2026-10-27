"""Quick drafts of the intro bridge, one per detail/sound variant, to compare side by side.

    python3 tools/variants.py            # all variants
    python3 tools/variants.py bubbles    # just one
    python3 tools/variants.py cinema --voice ../voice/samples/cb_natural   # with another voice

Each draft runs from the start to 1.5 s into the ad (half size, 25 fps, no motion blur), with the
ad's own sound under its first seconds. Output: out/variants/<variant>.mp4
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = Path(__file__).resolve().parent.parent
NAMES = ["comics", "vhs", "paper", "neon", "apple"]  # the latest batch; pass names to render others
FPS = 25


def main():
    args = sys.argv[1:]
    voice = None
    if "--voice" in args:
        i = args.index("--voice")
        voice = Path(args[i + 1]).resolve()
        args = args[:i] + args[i + 2:]
    names = args or NAMES
    if voice:
        # The timeline is built from public/bridge/lines.json: swap the voice in for these renders.
        bridge = ROOT / "public" / "bridge"
        backup = ROOT / "public" / "bridge-backup"
        shutil.move(bridge, backup)
        shutil.copytree(voice, bridge, ignore=shutil.ignore_patterns("preview.wav"))
        try:
            render(names, f"-{voice.name}")
        finally:
            shutil.rmtree(bridge)
            shutil.move(backup, bridge)
    else:
        render(names, "")


def render(names, suffix):
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
                        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", out / f"{name}{suffix}.mp4"], cwd=ROOT, check=True)
        raw.unlink()
        print("done:", out / f"{name}{suffix}.mp4", flush=True)


if __name__ == "__main__":
    main()
