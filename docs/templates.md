# Bridge templates

A brand uploads its ad once. For every video it runs in, Motion Ads builds a bridge into the ad and
a bridge back out. The bridge has to fit the video it interrupts: a shouting gag in the middle of an
ASMR video would lose the viewer faster than a plain cut. So the product has a panel of bridge
templates, and picks one per (video, ad) pair.

| Template | Energy | Voice | Made for | Never on |
|---|---|---|---|---|
| **Gag** (`MotionAd`) | high | narrator teasing the person | sport, action, vlog, comedy, gaming | ASMR, study, news, podcasts |
| **Replay** | very high | sports broadcaster | sport, action, gaming | ASMR, study, podcasts, news, cooking |
| **Thought** | medium | the person's inner voice | vlog, lifestyle, comedy, sport, cooking, tutorials | news, ASMR |
| **Squeeze** | low | none | podcasts, tutorials, news, streams, music, study | (works anywhere) |
| **Hush** | very low | none | ASMR, nature, cooking, study, music | comedy |

- **Gag**: freeze on the peak, the pause button becomes a glass caption pill, a narrator teases the
  person ("He's really motivated, isn't he? ... And you?"), the ad's own first word lands in place.
- **Replay**: "Wait, wait, wait." The video rewinds, replays in slow motion, a telestrator draws the
  move and marks the landing spot, "This replay is brought to you by..." and the ad floods out of
  the landing spot. Back: "Back to the action!"
- **Thought**: a thought bubble rises from the person's head, in their inner voice ("What if I
  just... built an app instead?"). The thought is the ad. After it they answer themselves ("Nah.
  Jump first.") and carry on.
- **Squeeze**: no words. The video squeezes into a card, the ad plays in a bigger card beside it,
  the video stays visible ("Back right after this."), then grows back. Inspired by the side-by-side
  ad formats of sports broadcasting (squeezeback, L-bar, NFL RedZone's double box, YouTube's
  side-by-side live ads).
- **Hush**: nothing snaps. The video slows down to a stop by itself, the background falls out of
  focus, one soft caption ("take a breath."), the frame melts into the ad's own background colour
  and the ad's first frame comes into focus. Back the same way, the video speeds up from a stop.

## How one is picked

`render/src/templates/catalog.ts`, `pick(video, ad)`:

1. Drop templates the video cannot carry (Gag and Thought need a person to cut out; Gag and Replay
   need a peak moment to freeze on).
2. +3 if the template is made for the video's genre, -5 if it must never run on it.
3. Energy: the wanted energy is 65 % the video's and 35 % the ad's; the further the template is
   from it, the lower it scores.
4. A quiet video (ASMR, study) gets no voice over it; a serious ad is never teased.

The ranking comes with its reasons, so a person can overrule it. In the pipeline, Muse Spark fills
the video profile (genre, energy, is there a person, is there a peak moment and when) and the ad
profile (energy, tone, how the ad opens), writes the lines for templates with a voice, and SAM 3.1
cuts out the person.

## Rendering a template

```sh
cd render
python3 tools/render.py out/templates/replay.mp4 --draft --preview --comp=Replay   # ~1 min, ad shortened
python3 tools/render.py out/replay.mp4 --comp=Replay                                # final, 50 fps, motion blur
```

`--comp` is the composition (`MotionAd`, `Replay`, `Thought`, `Squeeze`, `Hush`). `--preview` keeps
only the ad's first and last 2.5 s, to judge the bridges. Templates that remap time (Replay's
rewind and slow motion, Hush's speed ramps) read source frames made by `tools/frames.sh`.
