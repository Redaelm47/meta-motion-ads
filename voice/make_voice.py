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

SR = 24000
# The bridge into an existing ad (v3): short, fast, energetic lines; the ad's own voice takes over.
BRIDGE = [
    ("gag1", "Okay... he's really motivated, isn't he?"),
    ("gag2", "And you?"),
    ("back", "Alright... where were we?"),
]
LINES = [
    ("gag1", "He's motivated."),
    ("gag2", "And you?"),
    ("hook", "Motivated enough to finally launch your own website?"),
    ("ask", "With Nova, just say what you want..."),
    ("build", "and watch it build itself."),
    ("live", "Your site. Live in five minutes."),
    ("end", "Nova. Try it free."),
]


def trim(audio, threshold=0.004, pad=0.03):
    """Cut leading and trailing silence, keep a few ms of air."""
    idx = np.nonzero(np.abs(audio) > threshold)[0]
    if idx.size == 0:
        return audio, 0.0
    start = max(0, idx[0] - int(pad * SR))
    end = min(len(audio), idx[-1] + int(pad * SR))
    return audio[start:end], start / SR


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
