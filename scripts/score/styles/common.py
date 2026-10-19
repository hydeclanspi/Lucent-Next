"""Gestures every version uses in its own colours: builds into a cut, the kick that doubles, the slams."""
from ..clock import M, WALL


def kick_ramp(s, a, b, kind="pop", gain=-2.0):
    """The kick in quarters, then eighths in the last half second, stopping a sixteenth before b."""
    t = a
    while t < b - 0.125 - 1e-6:
        s.kick(t, kind, 0.9, gain)
        t += 0.25 if t < b - 0.5 else 0.125


def build(s, a, b, fill="snare", riser=True, swell=True, gain=0.0, kicks=False, seed=0, f0=None, f1=None):
    """Into a downbeat at b: a fill that quickens, a riser, a swelled cymbal that ends on b."""
    if fill:
        s.fill(a, b - 0.125 if kicks else b, fill, -18 + gain, -2 + gain, kicks)
    if riser:
        s.rise(a, b, -2 + gain, f0 or 300.0, f1 or 11000.0, seed=seed)
    if swell:
        s.swell_into(b, min(1.2, b - a), gain)


def hits(s, times, voicings, play, size=1.0, gain=0.0):
    """A row of hits on the given times: an impact each, and `play(t, notes, i)` for the music."""
    for i, (t, notes) in enumerate(zip(times, voicings)):
        s.impact(t, size, gain - 2, crash=i == 0)
        play(t, notes, i)


SPECS = [M["specs"] + 0.5 * i for i in range(4)]
CALLS = WALL["calls"]
