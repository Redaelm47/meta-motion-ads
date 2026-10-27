# Test on mainstream videos and ads (27 Oct 2026)

Does the system hold on content everyone has seen, not only on our own clip? Internal drafts
only: the videos and ads belong to their owners and are not in the repo (`render/public/spots/`
is ignored). Material and checks: `render/public/spots/raw/SCOUT.md`.

Rule for the lines (from Reda's feedback on the first panel): the bridge starts from what the
person is doing and leads into what the ad says, often leaving a sentence for the ad's first line
to finish, with a callback on the way back.

| Spot | Video (moment) | Ad | Bridge in | Ad's first words | Way back |
|---|---|---|---|---|---|
| `mrbeast-volvo` | MrBeast, Real Life Spider-Man Vs Skyscraper (mid-grab on the wall) | Volvo Trucks, The Epic Split | "He's halfway up a skyscraper. In a costume. Any advice?" | Van Damme: "I've had my ups and downs..." | "Noted. Keep climbing." |
| `stratos-ps5` (thought) | Red Bull Stratos (Felix steps off the capsule) | PS5 hardware trailer | *thinking:* "Hmm... I could've stayed home and played instead." | (music, console) ... "Play has no limits." | "Nah. No limits." |
| `stratos-ps5` (gag) | same | same | "Thirty-nine kilometres up. One small step... Some people have limits." | | "Clearly not him." |
| `dp-mercedes` | Dude Perfect, Water Bottle Flip 2 (bat just before the ball) | Mercedes-Benz "Chicken", Magic Body Control | "Bottle on a ball. Ball on a stick. Bat in his hands. Count him in?" | "Three, two, one." | "Stable. Now swing." |
| `cascadia-samsung` | GoPro, Danny MacAskill Cascadia (wheelie off a rooftop) | Samsung Galaxy Z TriFold design film | "He's riding off a roof. Surprisingly..." | card: "Surprisingly thin." | "What's next? Down, probably." (its last card: "The shape of what's next") |

Every spot also gets **Replay** ("This replay is brought to you by..."), which needs no lines of
its own.

What broke on the way and is fixed:
- Apple Vision took the capsule instead of Felix: `make_spot.py --cutout-box` looks only near him.
- Two blurred figures behind a window in the MrBeast shot (one might be a woman): `--crop` keeps
  them out of the picture.
- The slow-motion lead-in and Replay's rewind crossed a cut into the previous shot: spots now know
  where their shot starts (`steadyFrom`) and never go before it.
- Replay's camera showed the frame's edge when the person is near a side: the focus is clamped.
- Most ads end on black: the reply pill turns white on a dark last frame.

## Sources

Videos: https://www.youtube.com/watch?v=h5NvTTOlOtI (MrBeast), https://www.youtube.com/watch?v=Hz2F_S3Tl0Y
(Red Bull Stratos), https://www.youtube.com/watch?v=VJwoSfTOhyM (Dude Perfect),
https://www.youtube.com/watch?v=GL0rbxB9Lqg (GoPro Cascadia).
Ads: https://www.youtube.com/watch?v=M7FIvfx5J10 (Volvo Epic Split), https://www.youtube.com/watch?v=_NX8F9FBvg0
(PS5), https://www.youtube.com/watch?v=nLwML2PagbY (Mercedes Chicken), https://www.youtube.com/watch?v=chn5IsMArmE
(Samsung TriFold).
