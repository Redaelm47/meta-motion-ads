"""Voiceover with Kokoro-82M (open weights, Apache 2.0), on the CPU.

One wav per line, plus word timings, written to render/public/voice/ and lines.json.

    .venv/bin/python make_voice.py                 # default voice
    .venv/bin/python make_voice.py --voice bm_george --out samples/bm_george
"""

import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline

from lines import BRIDGE, LINES, SR, trim


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="am_michael")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--out", default="../render/public/voice")
    ap.add_argument("--set", choices=["bridge", "ad"], default="bridge")
    args = ap.parse_args()

    torch.set_num_threads(4)  # keep the laptop responsive
    pipe = KPipeline(lang_code="a")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    table = []
    for key, text in (BRIDGE if args.set == "bridge" else LINES):
        chunks, words = [], []
        offset = 0.0
        for result in pipe(text, voice=args.voice, speed=args.speed):
            audio = result.audio.numpy() if hasattr(result.audio, "numpy") else np.asarray(result.audio)
            for tok in result.tokens or []:
                if tok.start_ts is not None and tok.text.strip() and any(c.isalnum() for c in tok.text):
                    words.append({"w": tok.text, "start": offset + tok.start_ts, "end": offset + (tok.end_ts or tok.start_ts)})
            chunks.append(audio)
            offset += len(audio) / SR
        audio, cut = trim(np.concatenate(chunks))
        for w in words:
            w["start"] = round(max(0.0, w["start"] - cut), 3)
            w["end"] = round(max(0.0, w["end"] - cut), 3)
        sf.write(out / f"{key}.wav", audio, SR)
        table.append({"key": key, "text": text, "file": f"voice/{key}.wav", "duration": round(len(audio) / SR, 3), "words": words})
        print(f"{key}: {len(audio) / SR:.2f}s, {len(words)} words")

    (out / "lines.json").write_text(json.dumps({"voice": args.voice, "lines": table}, indent=1))


if __name__ == "__main__":
    main()
