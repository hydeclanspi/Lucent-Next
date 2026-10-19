"""The pitched instruments, each built from what makes the real one sound the way it does.

A piano is a hammer striking stiff strings: partials stretched sharp, every one dying at its own rate in
two stages, two or three strings a hair apart beating against each other. A marimba or a glockenspiel is a
bar with a handful of inharmonic modes. A plucked string is a delay line that loses a little brightness
on every trip (Karplus-Strong). A string section is many slightly different players, each with their own
vibrato; a choir is voices through the resonances of an open mouth. All return numpy arrays at 48 kHz:
mono (n,) unless they are an ensemble, which comes back stereo (2, n).
"""
import functools
import zlib

import numpy as np
from scipy import signal

from .clock import SR
from .dsp import (TAU, bp, cycles, db, eq, fade, hp, lp, moving_lowpass, mtof, noise, norm, samples, saturate, saw, shape, square,
                  times, width)


def _rng(*key):
    """A generator seeded by what is being played, the same on every run."""
    return np.random.default_rng(zlib.crc32(repr(key).encode()))


def velocity_gain(vel, range_db=30.0):
    """How loud a note is for its velocity (0-1): about 30 dB from the softest to the hardest."""
    return float(db(-range_db * (1 - vel) ** 1.25))


# ---------------------------------------------------------------- piano
@functools.lru_cache(maxsize=None)
def piano(midi, vel=0.7, hold=0.5, felt=False, seed=0):
    """One piano note held for `hold` seconds. Partials are stretched by the strings' stiffness; the hammer
    strikes about an eighth of the way along, so partials near every eighth are weak; harder blows are
    brighter. Each partial has a prompt decay and a long aftersound, and the two strings of a unison beat
    slowly against each other. Released, the damper stops it within a tenth of a second (the top octave has
    no dampers). felt: a layer of felt before the hammers, soft, close and intimate."""
    f0 = float(mtof(midi))
    rng = _rng("piano", midi, round(vel, 2), seed)
    t60 = float(np.interp(midi, [21, 36, 48, 60, 72, 84, 96, 108], [19, 15, 12, 9, 6, 3.5, 1.9, 1.0]))
    if felt:
        t60 *= 0.55
    damped = midi < 89
    rel = (0.11 if midi < 48 else 0.075) if damped else t60 / 6.91
    length = min(hold, t60 * 0.8) + (rel * 5 if damped else min(t60, 3.0))
    n = samples(length)
    t = times(n)
    B = 10 ** (-4.15 + 0.0235 * (midi - 21))
    kmax = int(min(72, SR * 0.45 / f0))
    k = np.arange(1, kmax + 1)
    fk = f0 * k * np.sqrt(1 + B * k * k)
    top = 9000 if felt else 15000
    keep = fk < top
    k, fk = k[keep], fk[keep]
    beta = 1 / (8.2 + 0.6 * rng.random())
    comb = 0.1 + 0.9 * np.abs(np.sin(np.pi * k * beta))
    tilt = k ** -(1.9 - 0.95 * vel)
    fc = (420 + 1700 * vel) if felt else (900 + 5600 * vel ** 1.4)
    hammer = 1 / np.sqrt(1 + (fk / fc) ** 3)
    amp = comb * tilt * hammer
    if f0 < 110:
        amp[0] *= (f0 / 110) ** 0.7  # the lowest strings give little of their fundamental
    tau2 = t60 / 6.91 / (1 + 2.2 * (fk / 1800) ** 1.35)
    tau1 = tau2 * (0.12 + 0.06 * rng.random())
    after = 0.22 if midi < 84 else 0.4
    cents = rng.uniform(0.35, 1.3) if midi > 33 else 0.0
    det = 2 ** (cents / 2400)
    ph = rng.random((2, len(k))) * 0.3
    y = np.zeros(n)
    for a in range(0, len(k), 12):
        sl = slice(a, a + 12)
        env = (1 - after) * np.exp(-t[None, :] / tau1[sl, None]) + after * np.exp(-t[None, :] / tau2[sl, None])
        osc = np.sin(TAU * (fk[sl, None] / det) * t[None, :] + TAU * ph[0, sl, None])
        osc += np.sin(TAU * (fk[sl, None] * det) * t[None, :] + TAU * ph[1, sl, None])
        y += np.sum(amp[sl, None] * env * osc, axis=0) * 0.5
    y = norm(y)
    # the strike itself: a knock of the hammer and the key (felt: the mechanism is half the sound)
    knock = lp(noise(n, 1000 + midi), 1600 if felt else 3200 + 4000 * vel) * np.exp(-t / (0.006 if felt else 0.003))
    thump = np.sin(TAU * 110 * t) * np.exp(-t / 0.012)
    y += (0.05 + 0.08 * vel + (0.09 if felt else 0.0)) * norm(knock) + (0.05 if felt else 0.015) * thump
    if damped:
        y *= np.where(t < hold, 1.0, np.exp(-(t - hold) / rel))
        if felt or vel > 0.5:  # the damper settling back
            i = samples(hold)
            if i < n - samples(0.03):
                m = samples(0.03)
                y[i:i + m] += 0.012 * lp(noise(m, 77 + midi), 900) * np.exp(-times(m) / 0.008)
    y *= fade(n, 0.0007 if vel > 0.6 else 0.0015, 0.01)
    return y * velocity_gain(vel, 34 if felt else 30)


def piano_pan(midi):
    """Heard from the player's bench: the bass to the left, the treble to the right."""
    return float(np.clip((midi - 64) / 40, -0.6, 0.6))


def soundboard(x, felt=False):
    """The case and soundboard: warmth low, a woody bloom, a softer top."""
    if felt:
        return eq(x, ("lowshelf", 180, 2.5, 0.7), ("peak", 420, 1.5, 1.0), ("peak", 2800, -3.0, 0.9), ("highshelf", 6000, -6.0, 0.7))
    return eq(x, ("peak", 110, 1.5, 0.8), ("peak", 280, 1.0, 1.2), ("peak", 1700, -1.5, 1.0), ("peak", 4200, 1.0, 1.0), ("highshelf", 9000, -2.0, 0.7))


# ---------------------------------------------------------------- struck bars
MALLETS = {
    # modes: (ratio, level, decay relative to the fundamental); t60 at the low and high ends of its range
    "marimba": ([(1, 1.0, 1.0), (3.99, 0.32, 0.2), (9.86, 0.11, 0.07)], (45, 1.9), (96, 0.45), 0.35),
    "vibes": ([(1, 1.0, 1.0), (3.98, 0.24, 0.45), (9.7, 0.05, 0.18)], (53, 5.0), (89, 2.0), 0.3),
    "glock": ([(1, 1.0, 1.0), (2.756, 0.42, 0.65), (5.404, 0.2, 0.4), (8.933, 0.08, 0.25)], (79, 3.2), (108, 1.3), 0.6),
    "celesta": ([(1, 1.0, 1.0), (2.0, 0.16, 0.5), (3.0, 0.05, 0.3), (5.2, 0.025, 0.15)], (60, 2.4), (108, 0.9), 0.15),
    "kalimba": ([(1, 1.0, 1.0), (5.6, 0.3, 0.12), (12.4, 0.08, 0.05)], (48, 2.2), (88, 0.8), 0.5),
    "bell": ([(0.5, 0.55, 1.4), (1, 1.0, 1.0), (1.19, 0.55, 0.8), (1.5, 0.35, 0.6), (2.0, 0.42, 0.55), (2.51, 0.2, 0.38), (3.0, 0.16, 0.3), (4.1, 0.07, 0.2)], (48, 7.0), (96, 2.5), 0.4),
}


@functools.lru_cache(maxsize=None)
def mallet(midi, kind="marimba", vel=0.7, seed=0, dur=None):
    """A struck bar: its few modes, each ringing out at its own rate, and the tick of the mallet."""
    modes, lo, hi, hard = MALLETS[kind]
    f0 = float(mtof(midi))
    rng = _rng("mallet", kind, midi, round(vel, 2), seed)
    t60 = float(np.interp(midi, [lo[0], hi[0]], [lo[1], hi[1]]))
    length = dur or min(t60 * 0.9, 6.0) + 0.05
    n = samples(length)
    t = times(n)
    y = np.zeros(n)
    for j, (ratio, level, life) in enumerate(modes):
        f = f0 * ratio * (1 + rng.normal(0, 0.0015))
        if f > SR * 0.45:
            continue
        lv = level * (vel ** (0.6 * j) if j else 1.0)
        y += lv * np.sin(TAU * f * t + rng.random() * 0.4) * np.exp(-t / (t60 * life / 6.91))
    if kind == "vibes":  # the motor's slow tremolo
        y *= 1 - 0.18 * (0.5 + 0.5 * np.sin(TAU * 5.2 * t))
    tick = lp(noise(n, 300 + midi + seed), 1500 + 9000 * hard * vel) * np.exp(-t / 0.0022)
    y = norm(y) + (0.04 + 0.12 * hard * vel) * norm(tick)
    return y * fade(n, 0.0004 if hard > 0.3 else 0.0012, 0.03) * velocity_gain(vel, 26)


# ---------------------------------------------------------------- plucked strings (Karplus-Strong)
PLUCKS = {
    # t60 low and high, brightness, where the string is plucked, the body's resonances (freq, gain, q)
    "pizz": ((40, 1.0), (96, 0.3), 0.45, 0.17, [(280, 4, 1.4), (460, 3, 1.6), (2800, 3, 1.2), (5200, -6, 0.8)]),
    "guitar": ((40, 4.0), (88, 1.3), 0.4, 0.13, [(105, 4, 1.5), (210, 3, 1.4), (420, 2, 1.5), (3200, -3, 0.8)]),
    "harp": ((24, 7.0), (103, 1.4), 0.3, 0.45, [(200, 2, 0.9), (1100, -2, 1.0), (7000, -4, 0.7)]),
    "uke": ((60, 2.2), (93, 0.9), 0.5, 0.2, [(230, 4, 1.5), (520, 3, 1.4), (3100, 2, 1.2), (6000, -5, 0.8)]),
    "bass": ((28, 5.0), (60, 2.5), 0.28, 0.15, [(70, 3, 1.0), (180, 2, 1.0), (900, 2, 1.0), (2500, -6, 0.7)]),
}


@functools.lru_cache(maxsize=None)
def pluck(midi, hold=1.0, kind="pizz", vel=0.7, seed=0):
    """A plucked string: a burst of noise shaped like the pluck, circulating in a delay line one period
    long that loses a little of its top on every trip; damped by the hand after `hold`."""
    lo, hi, bright, pick, body = PLUCKS[kind]
    f0 = float(mtof(midi))
    rng = _rng("pluck", kind, midi, round(vel, 2), seed)
    t60 = float(np.interp(midi, [lo[0], hi[0]], [lo[1], hi[1]]))
    br = np.clip(bright + 0.35 * (vel - 0.5) + rng.normal(0, 0.03), 0.05, 0.95)
    s = 0.5 - 0.42 * br  # the loop's low-pass: 0.5 darkest
    period = SR / f0
    ni = int(np.floor(period - s))
    d = period - s - ni
    c0, c1, c2 = (1 - d) * (1 - s), (1 - d) * s + d * (1 - s), d * s
    g = 10 ** (-3 / (t60 * f0))
    length = min(hold + 0.25, t60) + 0.05 if kind != "harp" else min(t60, hold + 1.5)
    n = samples(length)
    exc = lp(rng.standard_normal(ni + 2), f0 * (1.5 + 14 * br), 2) * np.hanning(ni + 2) ** 0.5
    m = int(pick * ni)
    if m > 0:
        exc[m:] -= exc[:-m] * 0.9
    y = np.zeros(n + 2)
    m0 = min(ni + 2, n + 2)
    y[:m0] = exc[:m0]
    start = ni + 2
    while start < n + 2:
        end = min(start + ni, n + 2)
        L = end - start
        y[start:end] += g * (c0 * y[start - ni:start - ni + L] + c1 * y[start - ni - 1:start - ni - 1 + L] + c2 * y[start - ni - 2:start - ni - 2 + L])
        start = end
    y = y[:n]
    t = times(n)
    if kind != "harp":
        y *= np.where(t < hold, 1.0, np.exp(-(t - hold) / 0.05))
    y = hp(y, max(30.0, f0 * 0.5), 2)
    y = eq(y, *[("peak", f, gdb, q) for f, gdb, q in body])
    return norm(y) * fade(n, 0.0005, 0.02) * velocity_gain(vel, 24)


# ---------------------------------------------------------------- bowed strings: a section of players
@functools.lru_cache(maxsize=None)
def strings(midis, dur, vel=0.7, attack=0.35, release=0.9, kind="legato", players=5, seed=0):
    """A section: for every note, several players, each a little out of tune with the others, each with
    their own vibrato that arrives a moment after the bow; the body's resonances; the hiss of the bows.
    kind: legato (slow bows), marcato (a bite, then held), spiccato (short and light)."""
    if kind == "spiccato":
        attack, release = 0.006, 0.06
    elif kind == "marcato":
        attack = 0.02
    n = samples(dur + release)
    t = times(n)
    rng = _rng("strings", midis, round(dur, 3), round(vel, 2), kind, seed)
    out = np.zeros((2, n))
    for midi in midis:
        f0 = float(mtof(midi))
        for p in range(players):
            cents = rng.normal(0, 6) + 0.0 * p
            rate = rng.uniform(4.8, 6.0)
            depth = rng.uniform(7, 15) * np.clip((t - attack * 0.6 - 0.12) / 0.4, 0, 1)
            drift = 3 * np.sin(TAU * rng.uniform(0.1, 0.3) * t + rng.random() * TAU)
            f = f0 * 2 ** ((cents + depth * np.sin(TAU * rate * t + rng.random() * TAU) + drift) / 1200)
            x = saw(f, n, rng.random())
            pan = (p / max(1, players - 1) * 2 - 1) * 0.7 + rng.normal(0, 0.05)
            a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
            off = samples(rng.uniform(0, 0.012 if kind != "spiccato" else 0.004))
            x = np.concatenate([np.zeros(off), x[: n - off]])
            out += np.vstack([x * np.cos(a), x * np.sin(a)])
    out /= np.sqrt(len(midis) * players)
    top = (1600 + 4200 * vel) if kind != "spiccato" else (2200 + 4400 * vel)
    out = lp(out, top, 4)
    out = eq(out, ("peak", 300, 1.5, 1.0), ("peak", 1150, -2.0, 1.2), ("peak", 2900, 3.0, 1.2), ("highshelf", 6500, -7.0, 0.7))
    bow = bp(noise(n, 9 + seed), 2400, 7000) * 0.025 * (0.4 + vel)
    out += np.vstack([bow, np.roll(bow, 97)])
    if kind == "spiccato":
        env = np.exp(-t / (0.09 + 0.06 * vel)) * fade(n, attack, 0.02)
    else:
        rise = np.clip(t / attack, 0, 1)
        rise = 0.5 - 0.5 * np.cos(np.pi * rise)
        bite = 1 + (0.6 * np.exp(-t / 0.07) if kind == "marcato" else 0.0)
        tail = np.where(t < dur, 1.0, np.cos(np.clip((t - dur) / release, 0, 1) * np.pi / 2) ** 2)
        env = rise * bite * tail
    return out * env * velocity_gain(vel, 20)


# ---------------------------------------------------------------- pads, choir, brass
@functools.lru_cache(maxsize=None)
def pad(midis, dur, kind="warm", attack=0.8, release=1.6, bright=0.5, seed=0):
    """Held chords. warm: two saws a few cents apart and a square an octave down, through a slowly
    breathing low-pass. air: the same, thinned to its top and lit by a fifth above. glass: sine pairs a
    hair apart, like a bowed glass. super: seven saws to a note, spread across the field, through a fixed
    low-pass that `bright` opens from 600 Hz to 9.6 kHz (the launch score's chords)."""
    n = samples(dur + release)
    t = times(n)
    rng = _rng("pad", midis, round(dur, 3), kind, seed)
    out = np.zeros((2, n))
    for midi in midis:
        f0 = float(mtof(midi))
        if kind == "glass":
            for side, c in ((0, -4), (1, 4)):
                out[side] += np.sin(TAU * f0 * 2 ** (c / 1200) * t + rng.random() * TAU) + 0.3 * np.sin(TAU * 2 * f0 * 2 ** (-c / 1200) * t)
            continue
        if kind == "super":
            for v in range(7):
                u = v / 3 - 1
                x = saw(f0 * 2 ** ((24 * u + rng.normal(0, 1)) / 1200), n, rng.random())
                a = (0.85 * u + 1) * np.pi / 4
                out += np.vstack([x * np.cos(a), x * np.sin(a)]) / np.sqrt(7)
            continue
        for side in (0, 1):
            c = 7 if side else -7
            x = saw(f0 * 2 ** ((c + rng.normal(0, 1.5)) / 1200), n, rng.random()) + saw(f0 * 2 ** ((-c * 0.4) / 1200), n, rng.random())
            x += 0.45 * square(f0 / 2, n, rng.random())
            if kind == "air":
                x += 0.5 * saw(f0 * 1.4983, n, rng.random())
            out[side] += x
    out /= np.sqrt(max(1, len(midis)))
    if kind == "super":
        out = lp(out, 600 + 9000 * bright, 2) * 1.6
    elif kind != "glass":
        cutoff = lambda tt: (600 + 2600 * bright) * (1 + 0.35 * np.sin(TAU * 0.11 * tt + 1.3))  # noqa: E731
        out = shape(out, moving_lowpass(cutoff, 2))
        if kind == "air":
            out = hp(out, 900, 2)
    env = np.clip(t / attack, 0, 1) ** 1.6 * np.where(t < dur, 1.0, np.cos(np.clip((t - dur) / release, 0, 1) * np.pi / 2) ** 2)
    return width(out * env * 0.3, 1.3)


VOWELS = {  # formant (Hz), bandwidth (Hz), level (dB): a soprano/alto blend
    "a": [(800, 80, 0), (1150, 90, -6), (2900, 120, -32), (3900, 130, -20), (4950, 140, -50)],
    "o": [(450, 70, 0), (800, 80, -11), (2830, 100, -22), (3800, 120, -22), (4950, 120, -50)],
    "u": [(325, 50, 0), (700, 60, -16), (2700, 170, -35), (3800, 180, -40), (4950, 200, -60)],
    "e": [(400, 60, 0), (1700, 90, -14), (2600, 100, -18), (3200, 120, -22), (4950, 120, -50)],
}


@functools.lru_cache(maxsize=None)
def choir(midis, dur, vowel="a", vel=0.6, attack=0.45, release=1.0, singers=4, seed=0):
    """Voices: each singer a pulse of breath, with their own small vibrato and pitch, sounded through the
    resonances (formants) of a vowel; a little breath on top."""
    n = samples(dur + release)
    t = times(n)
    rng = _rng("choir", midis, round(dur, 3), vowel, seed)
    src = np.zeros((2, n))
    for midi in midis:
        f0 = float(mtof(midi))
        for s in range(singers):
            cents = rng.normal(0, 8)
            vib = rng.uniform(9, 18) * np.clip((t - 0.25) / 0.5, 0, 1) * np.sin(TAU * rng.uniform(4.6, 5.8) * t + rng.random() * TAU)
            x = saw(f0 * 2 ** ((cents + vib) / 1200), n, rng.random())
            pan = (s / max(1, singers - 1) * 2 - 1) * 0.6
            a = (pan + 1) * np.pi / 4
            src += np.vstack([x * np.cos(a), x * np.sin(a)])
    src /= np.sqrt(len(midis) * singers)
    src += 0.05 * np.vstack([noise(n, 41 + seed), noise(n, 42 + seed)])
    out = np.zeros((2, n))
    for f, bw, g in VOWELS[vowel]:
        out += db(g) * signal.sosfilt(signal.butter(2, [max(30, f - bw / 2), f + bw / 2], "bandpass", fs=SR, output="sos"), src, axis=-1)
    env = np.clip(t / attack, 0, 1) ** 1.5 * np.where(t < dur, 1.0, np.cos(np.clip((t - dur) / release, 0, 1) * np.pi / 2) ** 2)
    return norm(out) * env * velocity_gain(vel, 18)


@functools.lru_cache(maxsize=None)
def brass(midis, dur, vel=0.8, kind="stab", seed=0):
    """A brass section from saws: the pitch scoops up into the note as the lips find it, the tone opens with
    the breath and settles; stab is short, swell builds."""
    n = samples(dur + (0.12 if kind == "stab" else 0.5))
    t = times(n)
    rng = _rng("brass", midis, round(dur, 3), kind, seed)
    out = np.zeros((2, n))
    for midi in midis:
        f0 = float(mtof(midi))
        for p in range(3):
            scoop = -45 * np.exp(-t / 0.045) + rng.normal(0, 5)
            x = saw(f0 * 2 ** (scoop / 1200), n, rng.random())
            a = ((p - 1) * 0.5 + 1) * np.pi / 4
            out += np.vstack([x * np.cos(a), x * np.sin(a)])
    out /= np.sqrt(len(midis) * 3)
    base = float(mtof(np.mean(midis)))
    if kind == "stab":
        cut = lambda tt: base * (2.5 + (6 + 10 * vel) * np.exp(-tt / 0.08))  # noqa: E731
        env = np.clip(t / 0.012, 0, 1) * np.where(t < dur, np.exp(-t / (dur * 1.4)), np.exp(-dur / (dur * 1.4)) * np.exp(-(t - dur) / 0.05))
    else:
        cut = lambda tt: base * (2 + (5 + 8 * vel) * np.clip(tt / dur, 0, 1) ** 1.5)  # noqa: E731
        env = np.clip(t / dur, 0, 1) ** 1.8 * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.08))
    out = shape(out, moving_lowpass(cut, 2))
    out = eq(out, ("peak", 1200, 4.0, 1.0), ("highshelf", 6000, -5, 0.7))
    out = saturate(norm(out), 1.6, 0.05)
    return out * env * velocity_gain(vel, 22)


# ---------------------------------------------------------------- bass and leads
@functools.lru_cache(maxsize=None)
def bass(midi, hold=0.25, kind="round", vel=0.8, seed=0):
    """round: a sine and a filtered saw, warm and solid. pluck: bright on the attack, closing fast.
    sub: almost pure, for under everything. finger: an electric bass string."""
    if kind == "finger":
        return pluck(midi, hold, "bass", vel, seed)
    f0 = float(mtof(midi))
    n = samples(hold + 0.08)
    t = times(n)
    env = np.where(t < hold, 1.0, np.exp(-(t - hold) / 0.025)) * fade(n, 0.003, 0.01)
    body = np.sin(TAU * f0 * t) + 0.18 * np.sin(TAU * 2 * f0 * t + 0.4)
    if kind == "sub":
        y = body
    else:
        x = saw(f0, n, 0.25) + 0.5 * square(f0 * 0.5, n, 0.1) * (kind == "round")
        if kind == "pluck":
            cut = lambda tt: f0 * (2.5 + (14 * vel) * np.exp(-tt / 0.06))  # noqa: E731
        else:
            cut = lambda tt: f0 * (3.2 + (5 * vel) * np.exp(-tt / 0.12))  # noqa: E731
        x = shape(x, moving_lowpass(cut, 2))
        y = saturate(norm(body) + 0.55 * norm(x), 1.4, 0.03)
    return norm(y) * env * velocity_gain(vel, 18)


@functools.lru_cache(maxsize=None)
def lead(midi, hold, kind="whistle", vel=0.8, glide_from=None, seed=0):
    """whistle: a pure tone with breath and a late vibrato. saw: two saws and a sub, singing. soft: a
    rounded square, like a toy flute."""
    f0 = float(mtof(midi))
    n = samples(hold + 0.15)
    t = times(n)
    rng = _rng("lead", midi, round(hold, 3), kind, seed)
    bend = 0.0 if glide_from is None else (glide_from - midi) * np.exp(-t / 0.035)
    vib = np.clip((t - 0.18) / 0.3, 0, 1) * (14 if kind == "whistle" else 9) * np.sin(TAU * 5.6 * t + rng.random() * TAU)
    f = f0 * 2 ** ((bend * 100 + vib) / 1200)
    if kind == "whistle":
        y = np.sin(TAU * cycles(f, n)) + 0.06 * np.sin(2 * TAU * cycles(f, n)) + 0.02 * np.sin(3 * TAU * cycles(f, n))
        breath = bp(noise(n, 11 + seed), f0 * 0.9, min(f0 * 3.0, 16000)) * 0.08
        y = y + breath * (0.6 + 0.4 * np.exp(-t / 0.05))
    elif kind == "saw":
        y = saw(f * 1.0025, n, 0.1) + saw(f * 0.9975, n, 0.6) + 0.4 * saw(f / 2, n, 0.3)
        y = lp(y, min(9000, f0 * 7), 2)
    else:
        y = lp(square(f, n, 0.0, 0.42), min(6000, f0 * 5), 2)
    env = np.clip(t / 0.012, 0, 1) * np.where(t < hold, 0.85 + 0.15 * np.exp(-t / 0.08), np.exp(-(t - hold) / 0.06))
    return norm(y) * env * fade(n, 0.002, 0.02) * velocity_gain(vel, 18)
