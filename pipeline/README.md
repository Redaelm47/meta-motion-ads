# pipeline

Places a flat ad onto a planar surface of a video (poster, screen, sign) so it looks filmed.

1. Track the surface through the video (one quad per frame).
2. Smooth the corner trajectories.
3. Warp the ad onto each frame, carry over the surface's lighting changes and the camera's grain,
   and keep anything in front of the surface (hands, people) in front.

Tracking currently runs without any model (`FeatureTracker`, from 4 corners on the first frame).
`MaskTracker` takes per-frame surface masks instead; it is where SAM 3.1 video tracking plugs in.

## Usage

```bash
python3.12 -m venv ../.venv && ../.venv/bin/pip install -e ".[dev]"

# save the first frame, read the 4 corners of the surface on it
../.venv/bin/python -m motion_ads.cli frame clip.mp4 first.png

../.venv/bin/python -m motion_ads.cli place clip.mp4 ad.png out.mp4 --corners "412,180 690,195 684,560 405,548"

# synthetic clip with known ground truth, prints the tracking error
../.venv/bin/python -m motion_ads.cli synth out/

../.venv/bin/python -m pytest -q
```
