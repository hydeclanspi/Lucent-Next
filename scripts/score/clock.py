"""The film's clock: the scene marks in demo/film/film.js, and the moments its seeded generators choose.

Picture and sound keep one clock. The marks sit on a grid of 120 beats a minute; the lasers on the stage
and the cores the wave strikes beyond the slit come from the same generators as in the film, so every
shot and every column of light is heard where it is seen.
"""
import pathlib
import re

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
FILM = ROOT / "demo" / "film"
SR = 48000
BEAT = 0.5
BAR = 4 * BEAT


def read_marks():
    text = (FILM / "film.js").read_text("utf-8")
    body = re.search(r"var M = \{(.*?)\};", text, re.S).group(1)
    return {k: float(v) for k, v in re.findall(r"(\w+):\s*([\d.]+)", body)}


M = read_marks()
DUR = M["end"]
LENGTH = int(round(DUR * SR))
GARDEN = M["cut"] + 28 * BEAT  # the bar line under the garden's first light
WALLS = M["walls"]
# The wallpapers (film.js, WALLS): each crosses on a beat; the last becomes glass and the three float free;
# the device rises and they land on it; the tap; the chosen one opens; night falls.
WALL = {"calls": [WALLS, WALLS + 1, WALLS + 2], "float": WALLS + 3.0, "swap": WALLS + 3.55, "rise": WALLS + 5.3,
        "risen": WALLS + 6.15, "land": [WALLS + 6.0, WALLS + 6.25, WALLS + 6.5], "sheen": WALLS + 6.85, "tap": WALLS + 7.45,
        "pick": WALLS + 7.6, "open": WALLS + 8.0, "fall": WALLS + 8.4, "gone": WALLS + 9.15}


def jsrng(seed):
    """The film's seeded generator (film.js rng), bit for bit."""
    state = seed & 0xFFFFFFFF
    mask = 0xFFFFFFFF

    def i32(v):
        v &= mask
        return v - (1 << 32) if v & 0x80000000 else v

    def imul(a, b):
        return i32((a & mask) * (b & mask))

    def draw():
        nonlocal state
        state = (state + 0x6D2B79F5) & mask
        x = state
        x = imul(i32(i32(x) ^ (x >> 15)), i32(i32(x) | 1))
        m = imul(i32(x ^ ((x & mask) >> 7)), i32(x | 61))
        x = i32(x ^ i32(x + m))
        return ((x ^ ((x & mask) >> 14)) & mask) / 4294967296

    return draw


def laser_shots():
    """Random's schedule on the stage, as film.js draws it."""
    r = jsrng(9)
    lanes = {"H": 0.68, "V1": 0.84, "V2": 0.84}
    shots = []

    def speed():
        while True:
            z = np.sqrt(-2 * np.log(max(1e-9, r()))) * np.cos(2 * np.pi * r())
            if abs(z) <= 3:
                return 0.7 + 0.1 * z

    def shot(lane, t0, rev):
        shots.append({"lane": lane, "t0": t0, "rev": rev, "dur": lanes[lane] / speed()})

    t = M["lasers"]
    shot("H", t, False); shot("V1", t, False); shot("V2", t, True)
    while t < M["console"] - 1.4:
        longest = max([s["dur"] for s in shots if s["t0"] == t] or [0])
        t = t + longest + 0.18 + r() * 0.45
        wave = r()
        count = 3 if wave < 0.07 else 2 if wave < 0.27 else 1
        pool = [["H", 0.7], ["V1", 0.15], ["V2", 0.15]]
        for _ in range(count):
            if not pool:
                break
            total = sum(p[1] for p in pool)
            pick, j = r() * total, 0
            while j < len(pool) - 1 and pick >= pool[j][1]:
                pick -= pool[j][1]
                j += 1
            lane = pool.pop(j)[0]
            rev = r() < (0.5 if lane == "H" else 4 / 30)
            shot(lane, t, rev)
    return shots


def beam_hits():
    """Beyond the slit, the moment the wave strikes each core, as film.js computes it: (time, depth, x, lifts)."""
    r = jsrng(2024)
    L = 30000.0

    def lerp(a, b, p):
        return a + (b - a) * p

    cores = []
    for _ in range(150):
        w, _, x, z = lerp(220, 980, r()), lerp(260, 1400, r()), lerp(-2700, 2700, r()), r() * L  # width, depth, x, z
        if abs(x) < 320 + w / 2:
            x = (-1 if x < 0 else 1) * (320 + w / 2 + r() * 300)
        r(); r(); r()  # colour, when it lights, its grid
        cores.append((x, z))
    t0, wave = M["rise"] - M["slit"], 0.8

    def seg(t, a, b):
        return min(1.0, max(0.0, (t - a) / (b - a)))

    def chip(t):
        b = max(0.0, t - t0 - 0.3)
        return 7000 * (1 - (1 - seg(t, 0.4, 2.8)) ** 3) + 1200 * t + 2600 * b * b

    def front(t):
        return 26000 * np.exp(-4.2 * (t - t0) / wave)

    c0, out = chip(t0), []
    for x, z in cores:
        z0 = (z - c0) % L
        if z0 < 150 or z0 > 25800:
            continue
        f = lambda t: z0 - (chip(t) - c0) - front(t)  # noqa: E731
        lo, hi = t0, t0 + wave
        if f(hi) <= 0:
            continue
        for _ in range(30):
            mid = (lo + hi) / 2
            if f(mid) < 0:
                lo = mid
            else:
                hi = mid
        out.append((M["slit"] + (lo + hi) / 2, z0, x, 200 < z0 < 12000))
    return sorted(out)


def knob_steps():
    """The console's six dials: when each starts, and the moments its value ticks over (every two points)."""
    out = []
    for i, (a, b) in enumerate([(50, 84), (50, 22), (50, 74), (50, 92), (50, 72), (50, 96)]):
        t0 = M["knobs"] + 0.5 * i
        ticks, last = [], None
        for ms in range(0, 860, 2):
            p = ms / 850
            p = min(1.0, p)
            e = 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2
            step = int((a + (b - a) * e) // 2)
            if last is not None and step != last:
                ticks.append(t0 + ms / 1000)
            last = step
        out.append((t0, a, b, ticks))
    return out
