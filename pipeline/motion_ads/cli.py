"""Command line entry points.

    python -m motion_ads.cli frame  VIDEO OUT.png        # save the first frame to pick corners
    python -m motion_ads.cli place  VIDEO TEXTURE OUT.mp4 --corners "x,y x,y x,y x,y"
    python -m motion_ads.cli synth  OUT_DIR               # synthetic clip + placed result
"""

import argparse
from pathlib import Path

import cv2
import numpy as np

from .composite import Compositor
from .geometry import order_quad, smooth_quads
from .tracking import FeatureTracker
from .video import read_video, write_video


def parse_corners(text):
    pts = [tuple(float(v) for v in p.split(",")) for p in text.split()]
    if len(pts) != 4:
        raise argparse.ArgumentTypeError("expected 4 points: 'x,y x,y x,y x,y'")
    return order_quad(pts)


def place(frames, texture, first_quad, occluders=None, smooth=9):
    quads = FeatureTracker().track(frames, first_quad, occluders)
    quads = smooth_quads(quads, window=smooth)
    comp = Compositor(texture, frames[0], quads[0])
    out = [comp(f, q, None if occluders is None else occluders[i]) for i, (f, q) in enumerate(zip(frames, quads))]
    return out, quads


def main(argv=None):
    ap = argparse.ArgumentParser(prog="motion_ads")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("frame")
    a.add_argument("video")
    a.add_argument("out")
    b = sub.add_parser("place")
    b.add_argument("video")
    b.add_argument("texture")
    b.add_argument("out")
    b.add_argument("--corners", type=parse_corners, required=True)
    b.add_argument("--smooth", type=int, default=9)
    c = sub.add_parser("synth")
    c.add_argument("out_dir")
    args = ap.parse_args(argv)

    if args.cmd == "frame":
        frames, _ = read_video(args.video)
        cv2.imwrite(args.out, frames[0])
    elif args.cmd == "place":
        frames, fps = read_video(args.video)
        texture = cv2.imread(args.texture, cv2.IMREAD_UNCHANGED)
        out, _ = place(frames, texture, args.corners, smooth=args.smooth)
        write_video(out, fps, args.out, audio_from=args.video)
    elif args.cmd == "synth":
        from .synth import make_clip, make_texture
        d = Path(args.out_dir)
        frames, gt, occs = make_clip()
        write_video(frames, 30, d / "synth_input.mp4")
        out, quads = place(frames, make_texture(), gt[0], occluders=occs)
        write_video(out, 30, d / "synth_placed.mp4")
        err = np.linalg.norm(quads - gt, axis=2)
        print(f"corner error: mean {err.mean():.2f}px, max {err.max():.2f}px")


if __name__ == "__main__":
    main()
