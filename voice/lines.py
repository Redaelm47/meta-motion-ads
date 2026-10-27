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
    # Gag scripts from docs/references-humour.md (twists of famous lines; the ad's own "You" is the punchline).
    "superman": [
        ("bird", "Is it a bird?"),
        ("plane", "Is it a plane?"),
        ("noits", "No, it's..."),
        ("okay", "Okay."),
        ("backbird", "Back to the bird."),
    ],
    "cartoon": [
        ("fact", "Fun fact:"),
        ("cartoons", "in cartoons, you only fall"),
        ("notice", "when you notice."),
        ("tell", "So nobody tell him."),
        ("okay", "Okay..."),
        ("noticed", "He noticed."),
    ],
    "scratch": [
        ("yep", "Yep. That's him."),
        ("wondering", "You're probably wondering"),
        ("howgot", "how he got up there."),
        ("better", "Better question:"),
        ("anyway", "Anyway."),
        ("thats", "That's how he got up there."),
    ],
    "buffering": [
        ("quick", "Quick pause."),
        ("fine", "He's fine."),
        ("just", "He's just..."),
        ("buffer", "buffering."),
        ("done", "Done buffering."),
    ],
    # Nature documentary narrator: calm take (--exaggeration 0.35 --cfg 0.5).
    "nature": [
        ("leaps", "The young male leaps,"),
        ("boss", "to show the others who's boss."),
        ("wall", "The wall is not impressed."),
        ("resumes", "Nature resumes."),
    ],
    # More thoughts (inner voice, --exaggeration 0.45 --cfg 0.5): an idea born mid-jump, leading to "an app".
    "thought_land": [
        ("note", "Note to self:"),
        ("app", "an app that tells me"),
        ("land", "where to land."),
        ("later", "Later."),
        ("landing", "Landing first."),
    ],
    "thought_plan": [
        ("midair", "Mid-air."),
        ("noplan", "No plan."),
        ("ifonly", "If only there was"),
        ("appfor", "an app for this..."),
        ("okay", "Okay."),
        ("planb", "Plan B: jump."),
    ],
    # Billboard with a voice (narrator, expressive like the gag).
    "bb_look": [
        ("wait", "Wait..."),
        ("look", "Look at that."),
        ("anyway", "Anyway."),
    ],
    "bb_behind": [
        ("psst", "Psst."),
        ("behind", "Behind you."),
        ("okay", "Okay."),
        ("eyes", "Eyes front."),
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
