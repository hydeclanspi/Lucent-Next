"""Sound for the picture: every touch, flight, door, laser and dial the film shows, at the moment it shows it.

The same in every version of the score; what is pitched (a ping of glass, a column of light, a
constellation) is tuned to that version's key, through its palette.
"""
import functools

import numpy as np

from .clock import M, WALL, beam_hits, knob_steps, laser_shots
from .dsp import (TAU, band, bp, cycles, fade, hp, lp, moving_lowpass, mtof, noise, norm, pan2, samples, saw, shape, swell,
                  times)
from .kit import whoosh
from .theory import degree


class Palette:
    """What the sound design borrows from the music: its key, and the voices for pitched light."""

    def __init__(self, tonic, mode="major", bell=None, pluck=None, gain=0.0):
        self.tonic, self.mode, self.gain = tonic, mode, gain
        self.bell = bell or (lambda m, v=0.7: glass(float(mtof(m)), 1.2, 0.3, int(m)))
        self.pluck = pluck or (lambda m, v=0.7: glass(float(mtof(m)), 0.6, 0.18, int(m) + 1))

    def note(self, d, octave=5):
        return degree(self.tonic % 12 + 12 * (octave + 1), self.mode, d)


@functools.lru_cache(maxsize=None)
def glass(f=2600.0, dur=1.2, life=0.3, seed=0):
    """A ping of glass: a few inharmonic modes, the higher ones gone first."""
    n = samples(dur)
    t = times(n)
    rng = np.random.default_rng(seed)
    y = np.zeros(n)
    for ratio, amp, d in ((1, 1, 1), (2.32, 0.62, 0.55), (4.25, 0.36, 0.32), (6.63, 0.2, 0.2)):
        if f * ratio < 21000:
            y += amp * np.sin(TAU * f * ratio * t + rng.random() * TAU) * np.exp(-t / (life * d))
    return norm(y) * fade(n, 0.0006, 0.03)


@functools.lru_cache(maxsize=None)
def click(freq=2600.0, dur=0.05, seed=51, body=0.4):
    n = samples(dur)
    t = times(n)
    y = hp(noise(n, seed), 1500) * np.exp(-t / 0.0018) + body * np.sin(TAU * freq * t) * np.exp(-t / 0.012)
    return norm(y) * fade(n, 0.0003, 0.01)


@functools.lru_cache(maxsize=None)
def key_tap(seed=61):
    n = samples(0.09)
    t = times(n)
    y = 0.7 * np.sin(TAU * 190 * t) * np.exp(-t / 0.018) + bp(noise(n, seed), 1200, 7000) * np.exp(-t / 0.004)
    return norm(y)


@functools.lru_cache(maxsize=None)
def thump(dur=0.5, freq=78.0, tau=0.12):
    n = samples(dur)
    t = times(n)
    f = freq * (1 + 0.8 * np.exp(-t / 0.02))
    return norm(np.sin(TAU * cycles(f, n)) * np.exp(-t / tau)) * fade(n, 0.0008, 0.05)


@functools.lru_cache(maxsize=None)
def zap(dur=0.5, f0=2600, f1=520, seed=91):
    """Light in flight: a falling glide over a breath of noise."""
    n = samples(dur)
    p = times(n) / dur
    g = f0 * (f1 / f0) ** (p ** 0.7)
    tone = np.sin(TAU * cycles(g, n)) + 0.3 * np.sin(2 * TAU * cycles(g, n))
    air = shape(noise(n, seed), band(lambda tt: 5000 * (1200 / 5000) ** np.clip(tt / dur, 0, 1), 0.7))
    env = np.clip(p / 0.08, 0, 1) * (1 - p) ** 1.4
    return norm((0.55 * tone + norm(air)) * env)


@functools.lru_cache(maxsize=None)
def pew(dur=0.16, f0=3400, f1=1500):
    n = samples(dur)
    t = times(n)
    g = f0 * (f1 / f0) ** (t / dur)
    return norm(np.sin(TAU * cycles(g, n)) * np.exp(-t / 0.05) * fade(n, 0.001, 0.02))


@functools.lru_cache(maxsize=None)
def blip(f, dur=0.045):
    """A bit of data: a pulse that is gone almost before it is heard."""
    n = samples(dur)
    t = times(n)
    y = np.sign(np.sin(TAU * f * t)) * 0.5 + 0.5 * np.sin(TAU * f * t)
    return norm(lp(y, min(f * 6, 16000), 2) * np.exp(-t / 0.012)) * fade(n, 0.0005, 0.005)


def scratch(dur=0.8, seed=101):
    """A felt pen on glass: bursts of filtered noise, one per tiny stroke."""
    n = samples(dur)
    t = times(n)
    rng = np.random.default_rng(seed)
    rate = 34 + 10 * np.sin(TAU * 1.3 * t)
    strokes = 0.55 + 0.45 * np.sin(TAU * np.cumsum(rate) / 48000 + rng.random()) ** 2
    y = bp(noise(n, seed), 2200, 7600) * strokes + 0.4 * bp(noise(n, seed + 1), 700, 1600) * strokes
    return norm(y * swell(n, 0.05, 0.12, 1))


def sparkle(dur, rate, f_lo, f_hi, seed=111, life=0.16, density=None, notes=None):
    """A cloud of tiny pings, at random or drawn from `notes` (midi)."""
    n = samples(dur)
    out = np.zeros((2, n))
    rng = np.random.default_rng(seed)
    t = 0.0
    while t < dur:
        d = density(t / dur) if density else 1.0
        t += rng.exponential(1 / max(rate * d, 1e-3))
        if t >= dur:
            break
        f = float(mtof(notes[rng.integers(len(notes))])) if notes else f_lo * (f_hi / f_lo) ** rng.random()
        ping = glass(round(f, 1), 0.45, round(life * (0.6 + 0.8 * rng.random()), 3), int(rng.integers(64)))
        i = samples(t)
        j = min(n, i + len(ping))
        out[:, i:j] += pan2(ping[: j - i] * (0.35 + 0.65 * rng.random()), rng.uniform(-0.85, 0.85))
    return out


def approach(dur=0.8, tail=0.5, seed=500):
    """Something sweeping towards us from the horizon, ever faster, and past: rising, closing, then wide."""
    n = samples(dur + tail)
    t = times(n)
    p = np.clip(t / dur, 0, 1)
    centre = lambda tt: 380 * (7000 / 380) ** np.clip(tt / dur, 0, 1) ** 1.25  # noqa: E731
    mono = norm(shape(noise(n, seed), band(centre, 0.7)))
    wide = np.vstack([norm(shape(noise(n, seed + 1), band(centre, 0.9))), norm(shape(noise(n, seed + 2), band(centre, 0.9)))])
    mono = mono + 0.35 * np.sin(TAU * cycles(220 * (2600 / 220) ** (p ** 1.4), n))
    env = (0.03 + 0.97 * p ** 3) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.14))
    w = p ** 2
    return (pan2(mono * (1 - 0.7 * w), 0) + 0.8 * wide * w) * env * fade(n, 0.005, 0.05)


def hyperdrive(dur=1.2, seed=520):
    """The jump: a whine that climbs through the octaves over a rushing of air, cut on the downbeat."""
    n = samples(dur)
    p = times(n) / dur
    f = 110 * (2200 / 110) ** (p ** 1.6)
    tone = lp(saw(f, n, 0.0) + 0.5 * saw(f * 1.5, n, 0.3), 6500)
    air = shape(noise(n, seed), band(lambda tt: 500 * (10000 / 500) ** np.clip(tt / dur, 0, 1) ** 1.4, 1.0))
    return norm((0.45 * norm(tone) + norm(air)) * p ** 2.2) * fade(n, 0.01, 0.003)


def power_down(midis, dur=0.62):
    """One more thing: the music winds down like a machine switched off."""
    n = samples(dur)
    p = times(n) / dur
    drop = 1 - 0.86 * p ** 0.75
    y = sum(saw(float(mtof(m)) * drop, n, 0.17 * i) for i, m in enumerate(midis))
    y = shape(y, moving_lowpass(lambda tt: 4000 * (220 / 4000) ** np.clip(tt / dur, 0, 1), 2))
    return norm(y) * (1 - p) ** 1.3 * fade(n, 0.002, 0.05)


def pane(dur=0.5, seed=0):
    """A pane of glass crossing the frame: a bright swish that travels from left to right, with a ring."""
    n = samples(dur)
    t = times(n)
    p = t / dur
    air = shape(noise(n, 600 + seed), band(lambda tt: 1400 * (7000 / 1400) ** (0.5 - 0.5 * np.cos(np.pi * np.clip(tt / dur, 0, 1))), 0.6))
    env = np.sin(np.pi * np.clip(p, 0, 1)) ** 1.6
    edge = glass(5200.0 + 300 * seed, dur, 0.12, 610 + seed)
    pos = -0.9 + 1.8 * (0.5 - 0.5 * np.cos(np.pi * p))
    a = (pos + 1) * np.pi / 4
    m = norm(air) * env + 0.18 * edge * np.clip((p - 0.4) / 0.1, 0, 1) * (p < 0.9)
    return np.vstack([m * np.cos(a), m * np.sin(a)])


def design(mix, pal):
    """Place every sound the picture asks for on the 'sfx' bus (and pitched light on 'sfx_tuned')."""
    m = M
    fx = mix.bus("sfx")
    tune = mix.bus("sfx_tuned")
    g = pal.gain
    N = pal.note

    # ---- once upon a time: the first photon; the ring drawn round it; the ring closes
    tune.add(pal.bell(N(0, 6), 0.6), m["photon"], -20 + g)
    fx.add(thump(0.6, 55, 0.2), m["photon"], -20 + g)
    dn = samples(m["draw1"] - m["draw0"] + 0.3)
    tt = times(dn)
    prog = np.clip(tt / (m["draw1"] - m["draw0"]), 0, 1)
    prog = np.where(prog < 0.5, 4 * prog ** 3, 1 - (-2 * prog + 2) ** 3 / 2)
    drawing = 0.25 * np.sin(TAU * cycles(900 + 1500 * prog, dn)) + norm(shape(noise(dn, 5), band(lambda t: 6500 + 0 * t, 0.5)))
    fx.add(pan2(norm(drawing) * swell(dn, 0.25, 0.35, 1.2), 0.5 * np.cos(-np.pi / 2 + prog * TAU)), m["draw0"], -33 + g)
    tune.add(pal.bell(N(4, 6), 0.55), m["draw1"], -23 + g, 0.1)

    # ---- the Home button pressed, twice
    P1, P2 = m["press1"], m["press2"]
    fx.add(click(2794, 0.05, 7), P1 + 0.012, -20 + g)
    fx.add(whoosh(1.4, 1600, 170, 0.12, 0.9, seed=40), P1, -23 + g)
    fx.add(click(3400, 0.04, 9, 0.6), m["home"] + 0.55, -25 + g, 0.35)
    tune.add(pal.bell(N(0, 7), 0.45), m["home"] + 0.7, -28 + g, 0.4)
    fx.end_at(whoosh(0.7, 3000, 400, 0.2, 0.7, seed=14)[::-1].copy(), P2 - 0.02, -22 + g)
    fx.add(click(2637, 0.05, 8), P2 + 0.012, -18 + g)
    fx.add(whoosh(1.8, 900, 160, 0.12, 0.9, seed=41), P2, -20 + g)
    fx.add(whoosh(1.1, 2500, 5200, 0.5, 0.6, seed=18), m["flash"] + 0.9, -31 + g)

    # ---- the workbench: a line of light assembles it; its layers part and return
    B0 = m["bench"]
    scan = B0 + 0.05, B0 + 1.75
    n = samples(scan[1] - scan[0] + 0.4)
    tt = times(n)
    pos = np.clip(tt / (scan[1] - scan[0]), 0, 1)
    pos = np.where(pos < 0.5, 4 * pos ** 3, 1 - (-2 * pos + 2) ** 3 / 2)
    hum = (np.sin(TAU * 1760 * tt) * 0.25 + norm(shape(noise(n, 19), band(lambda t: 3000 + 2500 * np.clip(t / 1.7, 0, 1), 0.6)))) * swell(n, 0.2, 0.45, 1)
    fx.add(pan2(norm(hum), pos * 1.6 - 0.8), scan[0], -31 + g)
    for x in (200, 416, 511, 605, 633, 650, 755, 1167, 1222, 1249, 1271, 1320):
        p = min(1, max(0, (x + 80) / 1680))
        u = np.cbrt(p / 4) if p < 0.5 else 1 - np.cbrt(2 * (1 - p)) / 2
        fx.add(click(2200 + x, 0.04, int(x), 0.5), scan[0] + u * (scan[1] - scan[0]), -32 + g, pan=(x / 1560) * 1.6 - 0.8)
    E0 = m["explode"]
    fx.add(whoosh(1.6, 180, 1200, 0.55, 0.8, seed=20), E0 + 0.2, -23 + g)
    for i in range(4):
        fx.add(click(2400 + 200 * i, 0.04, 30 + i, 0.6), E0 + 1.4 + 0.16 * i, -28 + g, pan=0.6)
    fx.end_at(whoosh(1.0, 900, 180, 0.3, 0.8, seed=22)[::-1].copy(), m["implode"] + 0.9, -22 + g)
    fx.add(click(1800, 0.06, 23, 0.8), m["implode"] + 0.9, -22 + g)
    fx.add(thump(0.4, 110, 0.1), m["implode"] + 0.9, -21 + g)

    # ---- the launch pad: words typed, light in flight to the arrow
    L0 = m["launch"]
    fx.add(whoosh(0.9, 700, 2400, 0.5, 0.7, seed=24), L0 + 0.05, -27 + g)
    for k in range(5):
        fx.add(key_tap(60 + k), m["type"] + 0.25 * k, -19 + (k % 2) + g, pan=-0.15 + 0.07 * k)
    fx.add(zap(0.55, 2400, 700, 25), m["fly"], -17 + g, 0.2)
    tune.add(pal.bell(N(4, 6), 0.6), m["fly"] + 0.52, -21 + g, 0.35)

    # ---- the narrow way, a thread of light; the door; data racing to the city
    S0, O0 = m["slit"], m["open"]
    n = samples(O0 - S0 + 0.3)
    tt = times(n)
    f_thread = float(mtof(N(4, 6)))
    thread = (np.sin(TAU * f_thread * tt) + 0.35 * np.sin(TAU * f_thread * 1.5 * tt + 1)) * (1 + 0.2 * np.sin(TAU * 8 * tt))
    fx.add(norm(thread) * swell(n, 0.2, 0.3, 1.2), S0, -29 + g)
    fx.add(whoosh(1.4, 500, 12000, 0.35, 1.1, seed=30), O0 - 0.15, -20 + g)
    rng = np.random.default_rng(310)
    penta = [N(d, 6) for d in (0, 1, 2, 4, 5)]
    t = O0 + 0.5
    while t < m["rise"] - 0.05:
        if rng.random() < 0.5:
            fx.add(blip(float(mtof(penta[rng.integers(len(penta))]))), t, -29 - 6 * rng.random() + g, rng.uniform(-0.8, 0.8))
        t += 0.0625

    # ---- the wave: something sweeps towards us; a column of light for every core it strikes; windows
    R0, J0 = m["rise"], m["jump"]
    fx.add(approach(0.8, 0.5, 500), R0, -17 + g)
    hits = beam_hits()
    ladder = [N(d, 4) for d in range(0, 7)] + [N(d, 5) for d in range(0, 7)] + [N(d, 6) for d in range(0, 4)]
    bins = {}
    for th, z0, x, _ in hits:
        bins.setdefault(int((th - R0) / 0.0625), []).append((z0, x))
    last = max(bins)
    for k, items in sorted(bins.items()):
        near = max(1 - z0 / 26000 for z0, _ in items)
        note = ladder[min(len(ladder) - 1, int(round(k / max(1, last) * (len(ladder) - 1))))]
        pan = float(np.clip(np.mean([x for _, x in items]) / 2700, -0.8, 0.8))
        tune.add(pal.pluck(note, 0.5 + 0.4 * near), R0 + k * 0.0625, -25 + 8 * near + min(4, len(items)) + g, pan)
    rng = np.random.default_rng(311)
    for th, z0, x, lifts in hits:
        if lifts:
            for _ in range(3):
                fx.add(blip(float(mtof(penta[rng.integers(len(penta))])) * (0.5 if rng.random() < 0.3 else 1)), th + 0.2 + 0.35 * rng.random(), -33 + 8 * (1 - z0 / 12000) + g, float(np.clip(x / 2700, -0.9, 0.9)))
    fx.add(hyperdrive(J0 - R0 - 0.8, 520), R0 + 0.8, -18 + g)
    fx.add(sparkle(3.4, 9, 4500, 9500, seed=523, life=0.2), J0 + 0.4, -33 + g)

    # ---- back to the search; the stage: rehearsal, bursts, lasers, the lights
    K0 = m["back"]
    fx.end_at(whoosh(0.6, 5000, 500, 0.3, 0.8, seed=36)[::-1].copy(), K0 + 0.05, -19 + g)
    fx.add(thump(0.4, 110, 0.08), K0 + 0.6, -23 + g)
    r0 = m["rehearse"]
    fx.add(zap(0.5, 2400, 800, 37), r0 + 0.75, -20 + g, 0.2)
    fx.end_at(zap(0.5, 2400, 800, 38)[::-1].copy(), r0 + 1.75, -21 + g, 0.1)
    for i, b0 in enumerate((m["burst"], m["burst"] + 0.35, m["burst"] + 0.7)):
        fx.add(zap(0.3, 3000, 1100, 39 + i), b0, -19 - i + g, 0.25)
        tune.add(pal.bell(N(4 if i < 2 else 7, 6), 0.45), b0 + 0.3, -27 + g, 0.35)
    fx.add(whoosh(0.7, 400, 2200, 0.4, 0.7, seed=45), m["sheet"] + 0.7, -25 + g)
    fx.add(click(2200, 0.05, 46, 0.9), m["lasers"] - 0.4, -21 + g, 0.4)
    fx.add(click(3100, 0.04, 47, 0.4), m["lasers"] - 0.33, -27 + g, 0.4)
    lane_pan = {"H": 0.0, "V1": -0.25, "V2": 0.1}
    for s in laser_shots():
        d = min(0.22, s["dur"] * 0.2)
        f0, f1 = (3600, 1800) if s["lane"] == "H" else (2900, 1500)
        p = lane_pan[s["lane"]] + (0.3 if s["rev"] else -0.3) * (s["lane"] == "H")
        fx.add(pew(round(d, 3), f0, f1), s["t0"], -27 + g, p)
    fx.add(norm(bp(noise(samples(0.5), 48), 300, 1600) * np.exp(-times(samples(0.5)) / 0.06)), m["show"] - 0.25, -22 + g)

    # ---- the console: aurora, glass, six dials
    C0 = m["console"]
    fx.add(whoosh(1.1, 1800, 7000, 0.45, 0.7, seed=50), C0, -23 + g)
    for i, (t0, a, b, ticks) in enumerate(knob_steps()):
        fx.add(click(1900, 0.05, 60 + i, 0.8), t0, -26 + g, pan=-0.45)
        for k, tk in enumerate(ticks):
            fx.add(click(4200, 0.02, 1000 + k + 10 * i, 0.3), tk, -35 + g, pan=-0.45)
        span = abs(b - a) / 46
        f_a, f_b = (900, 900 * 2 ** (2.6 * span)) if b > a else (900 * 2 ** (2.6 * span), 900)
        fx.add(whoosh(0.85, f_a, f_b, 0.5, 0.35, seed=64 + i), t0, -28 + g, -0.45)
    tune.add(pal.bell(N(2, 6), 0.55), m["knobs"] + 2.7, -25 + g, 0.4)

    # ---- one point of light; the name gathers out of glints
    fx.add(zap(0.42, 1200, 6000, 79), m["point"], -22 + g)
    tune.add(pal.bell(N(0, 7), 0.6), m["point"] + 0.42, -22 + g)
    gather = sparkle(1.5, 46, 2500, 9000, seed=101, life=0.12, density=lambda p: 0.2 + 1.6 * p ** 1.5, notes=[N(d, 6) for d in (0, 2, 4, 7)])
    fx.add(gather * swell(gather.shape[1], 0.3, 0.2, 1), m["lock"] + 0.15, -31 + g)

    # ---- one more thing: the machine winds down
    fx.add(power_down((N(0, 2), N(4, 2), N(0, 3), N(2, 3)), 0.62), m["dark"] - 0.08, -15 + g)
    fx.add(lp(norm(noise(samples(0.7), 112)), 600) * swell(samples(0.7), 0.1, 0.5, 1), m["dark"] - 0.1, -28 + g)

    # ---- the residents: a pen, two panes of glass, forty-nine, a meeting, a constellation, a ring
    fx.add(scratch(0.8, 111), m["pen"], -23 + g, -0.2)
    tune.add(pal.bell(N(4, 6), 0.6), m["lueurs"], -19 + g, -0.25)
    tune.add(pal.bell(N(2, 6), 0.55), m["lueurs"] + 0.3, -20 + g, -0.1)
    S1 = m["swarm"]
    fx.add(sparkle(2.6, 26, 2400, 8000, seed=114, life=0.12, density=lambda p: np.sin(np.pi * min(1, p * 1.1)) + 0.05), S1, -30 + g)
    fx.add(whoosh(2.6, 400, 3000, 0.4, 0.9, seed=115), S1, -30 + g)
    hitm = m["meet"] + 0.9
    fx.add(glass(3300.0, 1.2, 0.35, 130), hitm, -20 + g, 0.05)
    fx.add(click(3300, 0.04, 131, 0.5), hitm, -24 + g, 0.05)
    for i, d in enumerate((0, 2, 3, 4, 6, 7, 9, 10, 11)):
        tune.add(pal.pluck(N(d, 5), 0.6), m["stars"] + 0.11 * i, -22 + g, -0.6 + 0.15 * i)
    fx.add(thump(0.3, 220, 0.05), m["hold"], -25 + g)
    loop = m["loop"]
    n = samples(1.6)
    tt = times(n)
    swirl = norm(shape(noise(n, 170), band(lambda t: 900 + 1600 * np.sin(np.pi * np.clip(t / 1.6, 0, 1)), 0.7))) * swell(n, 0.5, 0.6, 1.2)
    fx.add(pan2(swirl, 0.7 * np.sin(TAU * tt / 1.6)), loop, -27 + g)
    flick = loop + 1.5
    fx.add(click(3600, 0.04, 172, 0.3), flick - 0.05, -25 + g, 0.3)
    fx.add(whoosh(0.45, 1500, 5000, 0.3, 0.6, seed=173), flick - 0.05, -23 + g, 0.35)
    for i, d in enumerate((0, 2, 4, 7, 9)):
        tune.add(pal.pluck(N(d, 5), 0.6), flick + 0.15 + 0.125 * i, -23 - 0.5 * i + g, 0.4 - 0.18 * i)
    fx.add(sparkle(m["device"] - m["garden"] - 0.6, 3.0, 3500, 7500, seed=181, life=0.4, notes=[N(d, 6) for d in (0, 2, 4, 5, 7)]), m["garden"] + 0.6, -34 + g)

    # ---- made for one screen: the device turns to us; the numbers count up as they land
    D0 = m["device"]
    fx.add(whoosh(1.5, 220, 1600, 0.6, 0.9, seed=190), D0 + 0.1, -22 + g, 0.2)
    for i in range(4):
        t0 = m["specs"] + 0.5 * i
        fx.add(norm(hp(noise(samples(0.4), 196 + i), 3000) * np.exp(-times(samples(0.4)) / 0.06)), t0, -26 + g, 0.35)
    for i, steps in ((0, 14), (2, 12), (3, 12)):
        t0 = m["specs"] + 0.5 * i
        prev = 0
        for ms in range(0, 900, 3):
            step = int((1 - (1 - ms / 900) ** 3) * steps + 1e-9)
            if step != prev:
                fx.add(click(5200, 0.015, ms + i, 0.2), t0 + ms / 1000, -35 + g, 0.4)
            prev = step

    # ---- three wallpapers: a dive into the screen; three panes of glass; glass in the air; the device rises,
    # the cards land on it; a tap; the chosen one opens and night falls
    W = WALL
    fx.add(whoosh(0.75, 300, 2600, 0.85, 0.8, seed=700), m["walls"] - 0.75, -22 + g)
    for i, t0 in enumerate(W["calls"]):
        fx.add(pane(0.5, i), t0 - 0.25, -21 + g)
    fx.add(whoosh(0.6, 3200, 900, 0.35, 0.7, seed=701), W["float"], -25 + g)
    glassing = sparkle(0.6, 40, 4200, 10000, seed=702, life=0.1, density=lambda p: 0.3 + 1.4 * p)
    fx.add(glassing * swell(glassing.shape[1], 0.3, 0.15, 1.4), W["float"] + 0.05, -30 + g)
    tune.add(pal.bell(N(4, 6), 0.55), W["swap"], -24 + g)
    for i, (t0, pan_) in enumerate(((W["swap"], -0.6), (W["swap"] + 0.1, 0.0))):  # two more fly in
        fx.add(pan2(whoosh(0.75, 700, 3600, 0.6, 0.7, seed=703 + i), pan_), t0, -25 + g)
    n = samples(W["rise"] - W["swap"] + 0.4)
    tt = times(n)
    air = shape(np.vstack([noise(n, 705), noise(n, 706)]), band(lambda t: 1800 + 900 * np.sin(np.pi * np.clip(t / (n / 48000), 0, 1)), 1.0))
    fx.add(norm(air) * swell(n, 0.6, 0.6, 1.4) * np.vstack([0.5 + 0.5 * np.sin(np.pi * tt / (n / 48000)), 0.5 + 0.5 * np.cos(np.pi * tt / (n / 48000))]), W["swap"], -36 + g)
    fx.add(whoosh(0.9, 160, 1400, 0.85, 0.8, seed=707), W["rise"], -24 + g)
    fx.add(thump(0.5, 70, 0.14), W["risen"] - 0.05, -23 + g)
    for i, t0 in enumerate(W["land"]):
        fx.add(pan2(whoosh(0.5, 2600, 700, 0.75, 0.6, seed=708 + i), (-0.5, 0.0, 0.5)[i]), t0 - 0.45, -28 + g)
        tune.add(pal.bell(N((4, 2, 0)[i], 6), 0.6), t0, -24 + g, (-0.5, 0.0, 0.5)[i])
        fx.add(click(3000 + 400 * i, 0.04, 710 + i, 0.4), t0, -30 + g, (-0.5, 0.0, 0.5)[i])
    sheen = sparkle(0.7, 22, 5000, 11000, seed=720, life=0.1, density=lambda p: np.sin(np.pi * p) + 0.05)
    sheen = sheen * np.linspace(-1, 1, sheen.shape[1])[None, :] * np.array([[-1], [1]]) * 0.5 + sheen * 0.5
    fx.add(sheen, W["sheen"], -31 + g)
    fx.add(click(2900, 0.04, 730, 0.7), W["tap"] + 0.02, -21 + g, 0.4)
    tune.add(pal.bell(N(7, 6), 0.7), W["pick"] + 0.05, -20 + g, 0.4)
    fx.add(whoosh(1.0, 400, 4200, 0.6, 0.9, seed=740), W["open"], -22 + g)
    fall = sparkle(1.4, 14, 1500, 4500, seed=750, life=0.35, density=lambda p: 1.2 - p, notes=[N(d, 5) for d in (7, 4, 2, 0)])
    fx.add(fall, W["fall"], -31 + g)
    fx.add(lp(norm(noise(samples(1.6), 760)), 900) * swell(samples(1.6), 0.6, 0.9, 1.4), W["fall"], -33 + g)

    # ---- launch from here: a line of light under the words; the ring returns
    T0, F2 = m["tag"], m["flash2"]
    n = samples(F2 - (T0 + 0.95))
    tt = times(n)
    line = np.sin(TAU * cycles(float(mtof(N(4, 4))) * 2 ** (tt / (n / 48000)), n)) * (tt / (n / 48000)) ** 1.5
    fx.add(norm(line), T0 + 0.95, -29 + g)
    ring = F2 + 3.0
    fx.add(click(2900, 0.05, 228), ring, -23 + g)
    tune.add(pal.bell(N(4, 6), 0.6), ring, -22 + g, 0.1)
