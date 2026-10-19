"""Notes, chords and voicings: enough harmony to write with.

    midi("D4") -> 62; chord("Bbmaj7") -> (root pitch class, [intervals]); voice("Dm9", 52, 74, previous)
"""
import itertools
import re

import numpy as np

PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(name):
    if not isinstance(name, str):
        return int(name)
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d)", name)
    return PC[m[1]] + {"#": 1, "b": -1, "": 0}[m[2]] + 12 * (int(m[3]) + 1)


def notes(text):
    """'D4 F4 A4' -> [62, 65, 69]"""
    return [midi(x) for x in text.split()]


QUALITY = {
    "": (0, 4, 7), "m": (0, 3, 7), "5": (0, 7), "dim": (0, 3, 6), "aug": (0, 4, 8),
    "sus2": (0, 2, 7), "sus4": (0, 5, 7), "sus": (0, 5, 7), "add9": (0, 4, 7, 14), "madd9": (0, 3, 7, 14),
    "6": (0, 4, 7, 9), "m6": (0, 3, 7, 9), "69": (0, 4, 7, 9, 14),
    "7": (0, 4, 7, 10), "m7": (0, 3, 7, 10), "maj7": (0, 4, 7, 11), "mmaj7": (0, 3, 7, 11),
    "9": (0, 4, 7, 10, 14), "m9": (0, 3, 7, 10, 14), "maj9": (0, 4, 7, 11, 14), "7sus4": (0, 5, 7, 10),
    "m11": (0, 3, 7, 10, 14, 17), "maj7#11": (0, 4, 7, 11, 18), "add11": (0, 4, 7, 17), "9sus4": (0, 5, 7, 10, 14),
}


def chord(symbol):
    """'F#m7/C#' -> (root pc, intervals, bass pc)."""
    m = re.fullmatch(r"([A-G][#b]?)([^/]*)(?:/([A-G][#b]?))?", symbol)
    root = (PC[m[1][0]] + {"#": 1, "b": -1}.get(m[1][1:], 0)) % 12
    ivs = QUALITY[m[2]]
    bass = root if not m[3] else (PC[m[3][0]] + {"#": 1, "b": -1}.get(m[3][1:], 0)) % 12
    return root, ivs, bass


def pcs(symbol):
    root, ivs, _ = chord(symbol)
    return sorted({(root + i) % 12 for i in ivs})


def bass_note(symbol, low=33, high=47):
    """The chord's bass (its root, or the note after the slash) in the bass register."""
    _, _, b = chord(symbol)
    m = low + ((b - low) % 12)
    return m if m <= high else m - 12


def voice(symbol, low=52, high=76, prev=None, size=4, top=None):
    """A voicing of the chord between low and high: `size` notes, all of them chord tones, always with its
    third (or its suspension) and its colours (sevenths, ninths), moving as little as possible from `prev`
    (smooth voice leading), never muddy low down, never wider than a tenth between neighbours."""
    root, ivs, _ = chord(symbol)
    tones = sorted({(root + i) % 12 for i in ivs})
    third = {(root + i) % 12 for i in ivs if i in (3, 4)} or {(root + i) % 12 for i in ivs if i in (2, 5)}
    colour = {(root + i) % 12 for i in ivs if i not in (0, 3, 4, 7) and (root + i) % 12 not in third}
    cands = [m for m in range(low, high + 1) if m % 12 in tones]
    n = min(size, len(cands))
    best, best_cost = None, 1e9
    for combo in itertools.combinations(cands, n):
        got = {m % 12 for m in combo}
        if third and not (got & third):
            continue
        if n >= 3 and len(colour - got) > max(0, len(tones) - n):
            continue
        gaps = np.diff(combo)
        if len(gaps) and (gaps.max() > 16 or combo[-1] - combo[0] > 24):
            continue
        cost = 0.0
        if prev:
            cost += sum(min(abs(a - b) for b in prev) for a in combo) + 0.5 * abs(np.mean(combo) - np.mean(prev))
        else:
            cost += 0.4 * abs(np.mean(combo) - (low + high) / 2)
        cost += 3.0 * (root not in got and n >= 3)                  # prefer the root, unless there is no room
        cost += 2.0 * (len(got) < min(n, len(tones)))                 # prefer every note different
        cost += sum(4.0 for k, g in enumerate(gaps) if g < 3 and combo[k] < 55)   # no thirds or seconds down low
        cost += 1.5 * (len(gaps) > 0 and gaps[-1] == 1)               # no semitone on top
        cost += 0.35 * max(0, combo[-1] - combo[0] - 12) + 0.4 * sum(max(0, g - 7) for g in gaps)   # close, not spread
        if top is not None:
            cost += 0.5 * abs(combo[-1] - top)
        if cost < best_cost:
            best, best_cost = list(combo), cost
    if best is None:  # the range is too tight for the chord: its root and third, wherever they fall
        r = low + ((root - low) % 12)
        best = sorted({r if r <= high else r - 12} | {low + ((t - low) % 12) for t in third})
    return best


def scale(tonic, mode="major"):
    steps = {"major": (0, 2, 4, 5, 7, 9, 11), "minor": (0, 2, 3, 5, 7, 8, 10), "dorian": (0, 2, 3, 5, 7, 9, 10),
             "lydian": (0, 2, 4, 6, 7, 9, 11), "mixolydian": (0, 2, 4, 5, 7, 9, 10), "penta": (0, 2, 4, 7, 9),
             "minpenta": (0, 3, 5, 7, 10)}[mode]
    t = midi(tonic) % 12 if isinstance(tonic, str) else tonic % 12
    return [(t + s) % 12 for s in steps]


def degree(tonic_midi, mode, d):
    """Scale degree d (0-based, may be negative or above 7) above a tonic in midi."""
    steps = {"major": (0, 2, 4, 5, 7, 9, 11), "minor": (0, 2, 3, 5, 7, 8, 10), "lydian": (0, 2, 4, 6, 7, 9, 11),
             "dorian": (0, 2, 3, 5, 7, 9, 10), "mixolydian": (0, 2, 4, 5, 7, 9, 10)}[mode]
    o, i = divmod(d, len(steps))
    return tonic_midi + 12 * o + steps[i]


def snap(m, pcs_, up=True):
    """The nearest note to m whose pitch class is in pcs_."""
    for k in range(12):
        for c in ((m + k, m - k) if up else (m - k, m + k)):
            if c % 12 in pcs_:
                return c
    return m


class Changes:
    """A timeline of chords: (start time, symbol) pairs, read back at any moment."""

    def __init__(self, seq=()):
        self.seq = sorted(seq)

    def add(self, t, symbol):
        self.seq.append((t, symbol))
        self.seq.sort()

    def at(self, t):
        name = None
        for s, c in self.seq:
            if s <= t + 1e-9:
                name = c
            else:
                break
        return name

    def spans(self, a, b, end=None):
        out = []
        for k, (s, name) in enumerate(self.seq):
            e = self.seq[k + 1][0] if k + 1 < len(self.seq) else (end if end is not None else b)
            s2, e2 = max(s, a), min(e, b)
            if name and e2 > s2 + 1e-6:
                out.append((s2, e2, name))
        return out
