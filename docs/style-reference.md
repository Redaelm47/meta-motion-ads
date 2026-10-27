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
