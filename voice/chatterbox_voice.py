"""Voice test with Chatterbox (Resemble AI, open weights, MIT), more expressive than Kokoro.

Same chunks as make_voice.py's BRIDGE, one wav per chunk plus lines.json (word timings spread
by length, Chatterbox gives none), and a preview with the film's pauses.

    .venv-cb/bin/python chatterbox_voice.py --out samples/cb_expressive --exaggeration 0.75 --cfg 0.35
    (the film uses this take: copy its wavs and lines.json into ../render/public/bridge)
    .venv-cb/bin/python chatterbox_voice.py --set replay --out ../render/public/voice/replay --exaggeration 0.95 --cfg 0.3
"""

import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from chatterbox.tts import ChatterboxTTS

from lines import SETS, trim

PAUSES = {"ok": 0.35, "motivated": 0.22, "isnthe": 0.6, "andyou": 1.0, "alright": 0.3, "where": 0.5}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="samples/chatterbox")
    ap.add_argument("--exaggeration", type=float, default=0.6)
    ap.add_argument("--cfg", type=float, default=0.4)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--set", default="bridge", choices=sorted(SETS))
    args = ap.parse_args()

    torch.set_num_threads(4)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = ChatterboxTTS.from_pretrained(device=device)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    table, preview = [], []
    for key, text in SETS[args.set]:
        torch.manual_seed(args.seed)
        wav = model.generate(text, exaggeration=args.exaggeration, cfg_weight=args.cfg).squeeze(0).cpu().numpy()
        audio, _ = trim(wav.astype(np.float32), pad=0.04)
        sf.write(out / f"{key}.wav", audio, model.sr)
        dur = len(audio) / model.sr
        words = text.split(" ")
        total = sum(len(w) for w in words)
        acc, timed = 0.0, []
        for w in words:
            timed.append({"w": w, "start": round(dur * acc / total, 3), "end": round(dur * (acc + len(w)) / total, 3)})
            acc += len(w)
        table.append({"key": key, "text": text, "file": f"bridge/{key}.wav" if args.set == "bridge" else f"voice/{args.set}/{key}.wav", "duration": round(dur, 3), "words": timed})
        preview += [audio, np.zeros(int(PAUSES.get(key, 0.4) * model.sr), np.float32)]
        print(f"{key}: {dur:.2f}s", flush=True)

    (out / "lines.json").write_text(json.dumps({"voice": "chatterbox", "lines": table}, indent=1))
    sf.write(out / "preview.wav", np.concatenate(preview), model.sr)


if __name__ == "__main__":
    main()
