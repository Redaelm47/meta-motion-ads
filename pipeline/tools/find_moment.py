"""Find where to freeze a video for the gag: peaks of motion inside a steady shot.

    python3 pipeline/tools/find_moment.py video.mp4 [--top 3] [--sheets out_dir]

A stand-in for Muse Spark (which will watch the video and also judge what is funny or tense). Here:
motion energy per frame at 10 fps (mean absolute difference of small grey frames), shot cuts
(very large differences), and the strongest motion peaks that sit at least 1 s from a cut, so the
freeze, the slow-motion lead-in and the resume all stay inside one shot. Prints the candidates as
JSON; --sheets saves a strip of frames around each one to look at.
"""

import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

FPS = 10
W, H = 160, 90


def frames(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-vf", f"fps={FPS},scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--top", type=int, default=3)
    ap.add_argument("--sheets")
    a = ap.parse_args()

    f = frames(a.video)
    diff = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    cut_level = max(30.0, np.percentile(diff, 99) * 0.9)
    cuts = [i + 1 for i, d in enumerate(diff) if d > cut_level]
    motion = np.convolve(np.where(diff > cut_level, 0, diff), np.ones(5) / 5, mode="same")

    def near_cut(i):
        return any(abs(i - c) < FPS for c in cuts)

    picked = []
    for i in np.argsort(-motion):
        if near_cut(i) or any(abs(i - j) < 2 * FPS for j in picked) or i < FPS or i > len(motion) - FPS:
            continue
        picked.append(int(i))
        if len(picked) == a.top:
            break
    out = [{"t": round((i + 1) / FPS, 1), "motion": round(float(motion[i]), 2)} for i in picked]
    print(json.dumps({"cuts": [round(c / FPS, 1) for c in cuts], "candidates": out}, indent=1))

    if a.sheets:
        d = Path(a.sheets)
        d.mkdir(parents=True, exist_ok=True)
        for c in out:
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(max(0, c["t"] - 1)), "-t", "2", "-i", a.video,
                            "-vf", "fps=5,scale=384:-1,tile=5x2:padding=2", "-frames:v", "1", str(d / f"moment_{c['t']:.1f}.jpg")], check=True)


if __name__ == "__main__":
    main()
