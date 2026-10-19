"""The form every version of the score follows: the film cut into sections, each with an energy from 0 to 5.

Energy is what the music should feel like in that scene, not just how loud: a version reads it to choose
how many instruments play and how hard, and the desk turns it into a level, so loud and quiet are always
clearly apart. 5 is the full band at the top of its voice; 1 is a single instrument close to the ear;
0 is silence.
"""
import numpy as np
from scipy.ndimage import uniform_filter1d

from .clock import DUR, GARDEN, M, WALL

SECTIONS = [
    # name, start, end, energy at its start, energy at its end
    ("intro", 0.0, M["press1"], 0.6, 1.6),
    ("home", M["press1"], M["press2"], 2.0, 2.2),
    ("build", M["press2"], M["flash"], 2.4, 4.4),
    ("place", M["flash"], M["bench"], 4.7, 4.3),
    ("bench", M["bench"], M["launch"], 3.0, 3.2),
    ("launch", M["launch"], M["warp"], 2.3, 3.0),
    ("slit", M["warp"], M["open"], 1.4, 1.6),
    ("silicon", M["open"], M["rise"], 3.4, 3.8),
    ("wave", M["rise"], M["jump"], 4.0, 4.7),
    ("world", M["jump"], M["back"], 5.0, 4.8),
    ("stage", M["back"], M["show"], 2.2, 3.8),
    ("show", M["show"], M["console"], 4.4, 4.2),
    ("console", M["console"], M["pillars"], 2.9, 3.2),
    ("pillars", M["pillars"], M["converge"], 4.0, 3.8),
    ("converge", M["converge"], M["lock"], 3.0, 4.7),
    ("name", M["lock"], M["dark"], 5.0, 4.6),
    ("silence", M["dark"], M["cut"], 0.0, 0.0),
    ("residents", M["cut"], M["swarm"], 1.3, 1.6),
    ("swarm", M["swarm"], GARDEN, 2.6, 3.0),
    ("garden", GARDEN, M["device"], 1.7, 2.8),
    ("device", M["device"], M["walls"], 4.0, 4.2),
    ("walls", M["walls"], WALL["float"], 4.4, 4.3),
    ("glass", WALL["float"], WALL["rise"], 3.0, 3.3),
    ("picker", WALL["rise"], WALL["open"], 3.0, 2.4),
    ("nightfall", WALL["open"], M["tag"], 3.0, 1.3),
    ("tag", M["tag"], M["flash2"], 2.0, 4.7),
    ("finale", M["flash2"], M["flash2"] + 4.0, 5.0, 4.8),
    ("coda", M["flash2"] + 4.0, DUR, 3.6, 1.0),
]
S = {name: (a, b) for name, a, b, _, _ in SECTIONS}


def energy(t):
    """The energy at time(s) t: each section glides from its start value to its end value."""
    t = np.asarray(t, float)
    out = np.zeros_like(t)
    for name, a, b, e0, e1 in SECTIONS:
        sel = (t >= a) & (t < b)
        p = (t[sel] - a) / (b - a)
        out[sel] = e0 + (e1 - e0) * p
    return out


def level(t, depth=3.2, smooth=0.12, knee=2.5, low=1.5):
    """The desk's fader for the music, in dB, from the energy: 0 dB at 5, `depth` dB a step down to the
    knee, then only `low` dB a step. Below the knee the arrangement thins out by itself (one instrument,
    close to the ear), so the fader need not push it further away: soft, never out of earshot."""
    e = np.clip(energy(t), 0.0, 5)
    db_ = np.where(e >= knee, -depth * (5 - e), -depth * (5 - knee) - low * (knee - e))
    # smooth the jumps between sections a little so a cut is a cut, not a click
    return uniform_filter1d(db_, max(1, int(smooth * 48000)), mode="nearest")


def section(t):
    for name, a, b, _, _ in SECTIONS:
        if a <= t < b:
            return name
    return SECTIONS[-1][0]
