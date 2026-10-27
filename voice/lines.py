"""Script lines and audio helpers shared by the voice generators (no model imports here)."""

import numpy as np

SR = 24000
# The bridge into an existing ad: the ad's own voice takes over after "And you?".
BRIDGE = [  # one chunk per breath; the pauses between them are placed in render/src/ad.ts
    ("ok", "Okay."),
    ("motivated", "He's really motivated,"),
    ("isnthe", "isn't he?"),
    ("andyou", "And you?"),
    ("alright", "Alright."),
    ("where", "Where were we?"),
]
# Lines for the other bridge templates (render/src/templates). Same rule: one chunk per breath.
SETS = {
    "bridge": BRIDGE,
    # Replay (sports broadcast): rewind, slow motion, a sponsor slate. The ad opens on "You".
    "replay": [
        ("wait", "Wait, wait, wait."),
        ("again", "Let's see that again."),
        ("look", "Look at that!"),
        ("brought", "This replay is brought to you by..."),
        ("back", "Back to the action!"),
    ],
    # Gag, another way back: the narrator lets him jump (a payoff instead of "Where were we?").
    "gag_out": [
        ("okay2", "Okay."),
        ("nowjump", "Now jump."),
    ],
    # Thought (inner voice): a thought bubble, the idea is the ad.
    "thought": [
        ("hmm", "Hmm..."),
        ("whatif", "What if I just..."),
        ("built", "built an app instead?"),
        ("nah", "Nah."),
        ("jump", "Jump first."),
    ],
}
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
