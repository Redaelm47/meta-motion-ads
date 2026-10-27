# Motion style reference

Baseline: the "one shape, never cut" UI motion study by @twoclipping on X
(https://x.com/twoclipping/status/2103273003555402193), made entirely in code. Summary of the
techniques we take from it, in our own words:

- **Look**: Dribbble / Apple-level UI motion. Light warm-gray canvas, black and white components,
  one UI font (Geist). No glows, particles, gradients on UI chrome or bouncy easing.
- **One element that morphs**: size, corner radius and color change on the same element; its
  content swaps with a short blur, with separate enter and exit timing so texts never overlap.
- **Springs, computed in closed form**: every animated value is a pure function of time. When a
  value retargets several times, it is the sum of one spring per change. At most a tiny overshoot.
- **Stretch**: the two edges of an indicator (tab, toggle knob) ride different springs, so the
  leading edge runs ahead of the trailing one.
- **A cursor drives everything** with real clicks and drags; while dragging, values follow the
  cursor, and on release they spring back from where they were.
- **Camera** zooms so the current state fills the frame.
- **Rhythm**: something happens on every beat of a fixed tempo grid, no dead time.
- **Motion blur**: render several subframes per frame and blend them (60 fps).
- **Check**: render one still per beat before the full render and fix anything cramped or off-grid.

Our adaptations:

- No music, only UI sound effects placed on the beat grid.
- The element lives on top of a real video frame (freeze frame + SAM 3.1 cutout), not on a blank canvas.

## More references from the same author (studied on 2026-10-27)

- "One HTML file" morph film (x.com/twoclipping/status/2109300899227095264): night to day and back,
  real photos for the big moments, frosted liquid-glass panels for small ones.
- "Nightshift" launch (x.com/twoclipping/status/2105927781678747965): the whole film happens over
  one real photo, UI in iOS-style glass panels on top of it. The closest look to ours (UI over a
  frozen video frame).
- Launch film with voiceover (x.com/twoclipping/status/2106526359589675085): captions typed word by
  word exactly when spoken, liquid-glass controls, slow pastel aura behind glass.
- Heat-camera film (x.com/twoclipping/status/2107822293653041659): cut to the voice, grain, a camera
  that never rests.
- Full workflow article (x.com/twoclipping/status/2104446706741825818).

Techniques worth taking, in our own words:

- **Nothing fades in, things change shape.** A button grows into the next page; text rises through a
  mask line instead of blurring in. One easing curve for every morph (cubic-bezier(.45,0,.15,1)),
  springs only for pop-ins.
- **Floods and irises**: a colour floods out of one object edge to edge in about 0.3 s (overscaled
  past the corners, eased by area so the first frames don't jump) and later contracts into another.
  A photo opens inside a circle that grows from the exact point it is born from.
- **Liquid glass** for panels over a photo: blurred copy of what is behind, a slightly magnified band
  along the edge, white tint, top sheen, bright rim, soft lift shadow.
- **Camera**: always drifting (about 1.0 → 1.04 per scene), one move at a time, zoom interpolated in
  log space, the next scene starts at the zoom the last one ended on.
- **Voice drives the edit**: word timings from Whisper (chunk by chunk, otherwise words land late),
  captions typed on the word, scene changes on phrase starts.
- **Sound**: one real recorded effect per event, placed by its measured peak, loudness -14 LUFS.
- **Checks**: 8 subframes (4 leave ghost copies on fast moves), a still per beat before rendering,
  and a frame-difference scan for single-frame pops.
