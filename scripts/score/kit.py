"""Drums, hand percussion, cymbals, impacts and transitions.

Every hit has a few variations (seed) so repeated notes are never the same sample twice, and a velocity
that changes its tone as well as its level, as a real hit does.
"""
import functools
import zlib

import numpy as np

from .dsp import (TAU, band, bp, cycles, db, eq, fade, hp, lp, noise, norm, samples, saturate, saw, shape, square, times, width)


def _rng(*key):
    return np.random.default_rng(zlib.crc32(repr(key).encode()))


def _glide(f_start, f_end, tau, n):
    t = times(n)
    return f_end + (f_start - f_end) * np.exp(-t / tau)


# ---------------------------------------------------------------- kick, snare, claps, snaps
KICKS = {  # start Hz, end Hz, pitch time, body decay, click, drive, top
    "pop": (210, 50, 0.026, 0.30, 0.55, 2.0, 9000),
    "tight": (240, 57, 0.017, 0.17, 0.6, 2.6, 10000),
    "deep": (165, 43, 0.048, 0.55, 0.3, 1.7, 7000),
    "soft": (135, 56, 0.03, 0.24, 0.06, 1.1, 1400),
    "taiko": (115, 62, 0.06, 0.75, 0.2, 1.3, 3500),
}


@functools.lru_cache(maxsize=None)
def kick(kind="pop", vel=1.0, seed=0):
    f1, f2, tp, tb, clk, drive, top = KICKS[kind]
    rng = _rng("kick", kind, seed)
    k = 1 + rng.normal(0, 0.012)
    n = samples(tb * 4 + 0.05)
    t = times(n)
    f = _glide(f1 * k * (0.9 + 0.1 * vel), f2 * k, tp, n)
    body = np.sin(TAU * cycles(f, n)) * np.exp(-t / (tb * (0.95 + 0.1 * rng.random())))
    body = np.tanh(drive * body) / np.tanh(drive)
    click = hp(noise(n, 70 + seed), 2500) * np.exp(-t / 0.0018) + 0.6 * np.sin(TAU * 1700 * t) * np.exp(-t / 0.005)
    y = lp(body + clk * vel * norm(click) * 0.5, top, 2)
    return norm(y) * fade(n, 0.0002, 0.03) * float(db(-18 * (1 - vel)))


@functools.lru_cache(maxsize=None)
def snare(kind="pop", vel=1.0, seed=0):
    """pop: a tuned head, the rattle of the wires a moment later. tight: higher and shorter. brush: a
    sweep of wire on the head. rim: the stick laid across the rim."""
    rng = _rng("snare", kind, seed)
    n = samples(0.45)
    t = times(n)
    if kind == "brush":
        sw = bp(noise(n, 90 + seed), 1800, 9000) * (np.clip(t / 0.012, 0, 1) * np.exp(-t / 0.22))
        return norm(sw) * fade(n, 0.002, 0.03) * float(db(-16 * (1 - vel)))
    if kind == "rim":
        y = np.sin(TAU * 1850 * t) * np.exp(-t / 0.012) + 0.7 * np.sin(TAU * 520 * t) * np.exp(-t / 0.02)
        y += 0.5 * hp(noise(n, 95 + seed), 3000) * np.exp(-t / 0.002)
        return norm(y) * fade(n, 0.0002, 0.02) * float(db(-14 * (1 - vel)))
    tune = (190 if kind == "pop" else 235) * (1 + rng.normal(0, 0.01))
    life = 0.11 if kind == "pop" else 0.07
    f = _glide(tune * 1.12, tune, 0.012, n)
    head = (np.sin(TAU * cycles(f, n)) + 0.55 * np.sin(TAU * cycles(f * 1.72, n))) * np.exp(-t / life)
    wires = bp(noise(n, 100 + seed), 2200, 10000) * np.exp(-t / (0.17 if kind == "pop" else 0.11))
    wires = np.concatenate([np.zeros(samples(0.0015)), wires])[:n]
    crack = hp(noise(n, 110 + seed), 5000) * np.exp(-t / 0.0025)
    y = 0.75 * head + (0.7 + 0.4 * vel) * wires + 0.35 * vel * crack
    y = saturate(norm(y), 1.4)
    return norm(y) * fade(n, 0.0002, 0.03) * float(db(-16 * (1 - vel)))


@functools.lru_cache(maxsize=None)
def clap(people=3, tail=0.12, vel=1.0, seed=0):
    """A clap is several bursts of air in a few milliseconds; a group is several people a little apart."""
    rng = _rng("clap", people, round(tail, 3), seed)
    n = samples(0.5)
    t = times(n)
    out = np.zeros((2, n))
    for p in range(people):
        fc = rng.uniform(1000, 1700)
        off = rng.uniform(-0.003, 0.006) if p else 0.0
        env = np.zeros(n)
        at = off
        for b in range(int(rng.integers(3, 5))):
            env += (t >= at) * np.exp(-np.clip(t - at, 0, None) / rng.uniform(0.003, 0.0055)) * (1 - 0.12 * b)
            at += rng.uniform(0.005, 0.011)
        env += 0.5 * (t >= at) * np.exp(-np.clip(t - at, 0, None) / (tail * rng.uniform(0.8, 1.2)))
        x = bp(noise(n, 120 + 7 * p + seed), fc / 1.7, min(fc * 2.6, 12000)) * env
        pan = rng.uniform(-0.45, 0.45) if people > 1 else 0.0
        a = (pan + 1) * np.pi / 4
        out += np.vstack([x * np.cos(a), x * np.sin(a)])
    return norm(out) * fade(n, 0.0002, 0.04) * float(db(-14 * (1 - vel)))


@functools.lru_cache(maxsize=None)
def snap(vel=1.0, seed=0):
    rng = _rng("snap", seed)
    n = samples(0.12)
    t = times(n)
    f = rng.uniform(2300, 3100)
    y = hp(noise(n, 130 + seed), 3000) * np.exp(-t / 0.0016) + 0.8 * np.sin(TAU * cycles(_glide(f * 1.08, f, 0.004, n), n)) * np.exp(-t / 0.016)
    y += 0.25 * np.sin(TAU * 190 * t) * np.exp(-t / 0.007)
    return norm(y) * fade(n, 0.0001, 0.02) * float(db(-14 * (1 - vel)))


# ---------------------------------------------------------------- metal: hats, shakers, tambourine, cymbals
HAT_RATIOS = (1.0, 1.4825, 1.8, 2.5459, 2.6295, 3.9012)


@functools.lru_cache(maxsize=None)
def hat(kind="closed", vel=0.8, seed=0):
    """Resonant noise and a cluster of square-wave partials, as cymbals ring: closed, open, or the pedal."""
    rng = _rng("hat", kind, seed)
    life = {"closed": 0.032, "pedal": 0.02, "open": 0.33}[kind] * (0.85 + 0.3 * rng.random())
    n = samples(life * 6 + 0.02)
    t = times(n)
    base = 410 * (1 + rng.normal(0, 0.01))
    metal = sum(square(base * r, n, rng.random()) for r in HAT_RATIOS)
    metal = bp(metal, 7000, 15000, 2)
    air = hp(noise(n, 140 + seed), 7000, 4)
    ring = eq(air, ("peak", 8200, 9, 6), ("peak", 10400, 7, 6), ("peak", 12600, 5, 5))
    y = 0.45 * norm(metal) + 0.55 * norm(ring)
    top = 9000 + 7000 * vel if kind != "pedal" else 8000
    y = lp(y, top, 2) * np.exp(-t / life)
    if kind == "open":
        y *= 0.35 + 0.65 * np.exp(-t / 0.05)
    return norm(y) * fade(n, 0.0002 if kind != "pedal" else 0.002, 0.01) * float(db(-16 * (1 - vel)))


@functools.lru_cache(maxsize=None)
def shaker(vel=0.8, length=0.09, seed=0):
    """Beads in a shell: dozens of tiny impacts gathered into one gesture."""
    rng = _rng("shaker", round(length, 3), seed)
    n = samples(length + 0.03)
    y = np.zeros(n)
    for when in rng.beta(2.2, 3.0, 46) * length:
        i = samples(when)
        m = min(n - i, samples(0.0012))
        if m > 1:
            y[i:i + m] += rng.standard_normal(m) * np.exp(-times(m) / 0.0004) * rng.uniform(0.3, 1.0)
    y = bp(y, 3200, 11000, 2)
    return norm(y) * fade(n, 0.001, 0.01) * float(db(-14 * (1 - vel)))


@functools.lru_cache(maxsize=None)
def tambourine(kind="shake", vel=0.8, seed=0):
    """Jingles: small cymbals that ring for a moment; a hit adds the hand on the skin."""
    rng = _rng("tamb", kind, seed)
    n = samples(0.35)
    t = times(n)
    jingle = np.zeros(n)
    spread = 0.04 if kind == "shake" else 0.006
    for _ in range(9):
        f = rng.uniform(5200, 11500)
        at = rng.uniform(0, spread)
        life = rng.uniform(0.05, 0.16)
        jingle += (t >= at) * np.sin(TAU * f * (t - at)) * np.exp(-np.clip(t - at, 0, None) / life) * rng.uniform(0.4, 1.0)
    beads = np.zeros(n)
    g = shaker(vel, 0.05, seed + 7)
    beads[:min(n, len(g))] = g[:n]
    y = norm(jingle) + 0.5 * beads
    if kind == "hit":
        y = y + 0.4 * np.sin(TAU * 190 * t) * np.exp(-t / 0.03)
    return norm(hp(y, 2500, 2) if kind == "shake" else y) * fade(n, 0.0005, 0.03) * float(db(-14 * (1 - vel)))


@functools.lru_cache(maxsize=None)
def cymbal(kind="crash", dur=2.6, seed=0):
    """A crash, a ride's bell, or a cymbal swelled with soft mallets (swell, which grows to its end)."""
    rng = _rng("cymbal", kind, round(dur, 2), seed)
    n = samples(dur)
    t = times(n)
    if kind == "ride":
        bell = sum(a * np.sin(TAU * f * t + rng.random()) for f, a in ((2950, 1.0), (4330, 0.6), (5470, 0.4), (7120, 0.25)))
        y = 0.4 * bell * np.exp(-t / 0.35) + hp(noise(n, 150 + seed), 5500) * np.exp(-t / 0.25)
        return norm(y) * fade(n, 0.0002, 0.05)
    partials = np.zeros(n)
    for _ in range(26):
        f = rng.uniform(2800, 12500)
        partials += np.sin(TAU * f * t + rng.random() * TAU) * np.exp(-t / rng.uniform(0.4, 1.6))
    wash = hp(noise(n, 160 + seed), 3500, 2)
    y = 0.4 * norm(partials) + norm(wash)
    if kind == "crash":
        y *= np.exp(-t / (dur * 0.33)) * (0.35 + 0.65 * np.exp(-t / 0.08))
        y = y + 0.3 * bp(noise(n, 170 + seed), 300, 2500) * np.exp(-t / 0.05)
    else:  # swell
        y = lp(y, 9000) * (t / dur) ** 2.2
    return width(np.vstack([norm(y), norm(np.roll(y, 211))]), 1.2) * fade(n, 0.0005 if kind == "crash" else 0.05, 0.2 if kind == "crash" else 0.004)


# ---------------------------------------------------------------- skins and wood
MEMBRANE = (1.0, 1.59, 2.14, 2.30, 2.65, 2.92)


@functools.lru_cache(maxsize=None)
def skin(f0, kind="open", vel=0.8, seed=0):
    """A hand drum: a membrane's modes, a slight drop in pitch as the head relaxes. open, mute or slap."""
    rng = _rng("skin", round(f0, 1), kind, seed)
    n = samples(0.6)
    t = times(n)
    life = {"open": 0.2, "mute": 0.045, "slap": 0.07}[kind]
    y = np.zeros(n)
    for j, r in enumerate(MEMBRANE):
        f = _glide(f0 * r * 1.04, f0 * r, 0.02, n) * (1 + rng.normal(0, 0.003))
        y += (0.6 ** j) * np.sin(TAU * cycles(f, n)) * np.exp(-t / (life * (1 - 0.1 * j)))
    hand = bp(noise(n, 180 + seed), 1500 if kind == "slap" else 400, 7000 if kind == "slap" else 2500) * np.exp(-t / (0.008 if kind == "slap" else 0.004))
    y = norm(y) + (0.9 if kind == "slap" else 0.25) * norm(hand)
    return norm(y) * fade(n, 0.0003, 0.03) * float(db(-16 * (1 - vel)))


@functools.lru_cache(maxsize=None)
def tom(f0=110.0, vel=0.9, seed=0):
    n = samples(0.7)
    t = times(n)
    f = _glide(f0 * 1.5, f0, 0.035, n)
    y = np.sin(TAU * cycles(f, n)) * np.exp(-t / 0.28) + 0.35 * np.sin(TAU * cycles(f * 1.59, n)) * np.exp(-t / 0.12)
    y += 0.3 * bp(noise(n, 190 + seed), 400, 4000) * np.exp(-t / 0.02)
    return norm(saturate(norm(y), 1.5)) * fade(n, 0.0002, 0.04) * float(db(-16 * (1 - vel)))


@functools.lru_cache(maxsize=None)
def taiko(vel=1.0, seed=0):
    """A great drum: the stick's crack, the skin's bloom, and the body of air behind it."""
    n = samples(1.6)
    t = times(n)
    k = kick("taiko", 1.0, seed)
    y = np.zeros(n)
    y[:min(n, len(k))] = k[:n]
    skin_ = bp(noise(n, 200 + seed), 150, 1300) * np.exp(-t / 0.16)
    crack = hp(noise(n, 210 + seed), 2000) * np.exp(-t / 0.003)
    y = norm(y) + 0.45 * norm(skin_) + 0.3 * norm(crack)
    return norm(y) * fade(n, 0.0002, 0.1) * float(db(-14 * (1 - vel)))


@functools.lru_cache(maxsize=None)
def wood(kind="clave", vel=0.8, seed=0):
    n = samples(0.12)
    t = times(n)
    if kind == "clave":
        y = np.sin(TAU * 2450 * t) * np.exp(-t / 0.028) + 0.2 * np.sin(TAU * 3900 * t) * np.exp(-t / 0.01)
    else:  # block
        y = np.sin(TAU * 1050 * t) * np.exp(-t / 0.03) + 0.5 * np.sin(TAU * 1780 * t) * np.exp(-t / 0.015)
    y += 0.2 * hp(noise(n, 220 + seed), 2000) * np.exp(-t / 0.0015)
    return norm(y) * fade(n, 0.0002, 0.02) * float(db(-14 * (1 - vel)))


# ---------------------------------------------------------------- the weight under a cut, and the way into it
@functools.lru_cache(maxsize=None)
def impact(size=1.0, seed=0):
    """A sub that falls away, a punch, a crack of light, a body of air: the weight under a cut."""
    n = samples(2.2 + size)
    t = times(n)
    sub = np.sin(TAU * cycles(_glide(85, 31, 0.22, n), n)) * np.exp(-t / (0.45 + 0.5 * size))
    punch = np.sin(TAU * cycles(_glide(170, 52, 0.03, n), n)) * np.exp(-t / 0.22)
    crack = hp(noise(n, 230 + seed), 2500) * np.exp(-t / 0.005)
    air = bp(noise(n, 240 + seed), 140, 1200) * np.exp(-t / (0.18 + 0.15 * size))
    mono = saturate(norm(sub + 0.8 * punch), 1.8) + 0.35 * norm(crack) + 0.5 * norm(air)
    wide = np.vstack([lp(hp(noise(n, 250 + seed), 400), 6000), lp(hp(noise(n, 251 + seed), 400), 6000)]) * np.exp(-t / (0.25 + 0.2 * size))
    out = np.vstack([mono, mono]) * 0.8 + 0.25 * size * norm(wide)
    return out * fade(n, 0.0003, 0.4) / max(1e-9, np.max(np.abs(out)))


@functools.lru_cache(maxsize=None)
def riser(dur, lo=300.0, hi=9000.0, tone=(196.0, 1568.0), seed=0, curve_=2.2):
    """Noise through a band that climbs, a tone that climbs with it, wider as it rises; cut at the top."""
    n = samples(dur)
    t = times(n)
    p = t / dur
    l_ = np.vstack([noise(n, 260 + seed), noise(n, 261 + seed)])
    sweep = shape(l_, band(lambda tt: lo * (hi / lo) ** np.clip(tt / dur, 0, 1) ** 1.5, 0.9))
    g = tone[0] * (tone[1] / tone[0]) ** (p ** 1.5)
    tonal = np.sin(TAU * cycles(g, n)) + 0.25 * saw(g * 1.5, n, 0.2) * p
    out = norm(sweep) * (0.6 + 0.4 * p) + 0.3 * np.vstack([tonal, tonal])
    out = width(out, 0.3 + 1.0 * p ** 1.5)
    return norm(out) * p ** curve_ * fade(n, 0.01, 0.004)


@functools.lru_cache(maxsize=None)
def whoosh(dur, f0, f1, peak=0.55, octaves=0.75, seed=0, curve_=1.6):
    """Air moved: noise through a band that glides from f0 to f1, rising to a peak and falling away."""
    n = samples(dur)
    x = noise(n, 270 + seed)
    y = shape(x, band(lambda t: f0 * (f1 / f0) ** np.clip(t / dur, 0, 1), octaves))
    p = times(n) / dur
    env = np.where(p < peak, (p / peak) ** curve_, ((1 - p) / (1 - peak)) ** 1.3)
    return norm(y * env)


@functools.lru_cache(maxsize=None)
def braam(midis, dur, seed=0):
    """The cinematic horn: a low cluster of brass, overdriven, opening slowly."""
    from .dsp import moving_lowpass, mtof
    n = samples(dur + 0.6)
    t = times(n)
    rng = _rng("braam", midis, round(dur, 2), seed)
    x = np.zeros(n)
    for m in midis:
        f = float(mtof(m))
        for _ in range(4):
            x += saw(f * 2 ** (rng.normal(0, 7) / 1200), n, rng.random())
    x = shape(x, moving_lowpass(lambda tt: 120 + 1900 * np.clip(tt / (dur * 0.6), 0, 1) ** 1.4, 2))
    x = saturate(norm(x), 3.0, 0.1)
    env = np.clip(t / 0.06, 0, 1) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.15))
    return width(np.vstack([x, np.roll(x, 137)]) * env, 1.1)
