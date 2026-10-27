#!/bin/sh
# Source frames around the frozen moment, interpolated to 60 fps, for templates that remap time
# (speed ramps, rewind, slow-motion replay): src/kit.tsx picks a frame per output time.
set -e
cd "$(dirname "$0")/.."
mkdir -p public/demo/frames
rm -f public/demo/frames/*.jpg
nice -n 10 ffmpeg -loglevel error -y -ss 0.5 -t 3.3 -i public/demo/clip.mp4 \
  -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1" -q:v 3 -start_number 0 public/demo/frames/f%03d.jpg
ls public/demo/frames | wc -l
