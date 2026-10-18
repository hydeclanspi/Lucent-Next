"""Compose the concept film's score from its timeline.

    python3 scripts/film-score.py                                  # demo/film/score.m4a and score.webm
    python3 scripts/film-score.py --wav score.wav --report score.png

The score reads the scene marks in demo/film/film.js, so picture and sound keep one clock: the marks sit
on a grid of 120 beats a minute, and so does the music. Drums, a rolling bass, arpeggios and chords move
on that grid, and every press, flash, cut and door lands on a beat. The lasers on the stage and the cores
the wave strikes beyond the slit come from the same seeded generators as in the film, so every shot and
every column of light is heard where it is seen.

Everything is synthesized here with numpy and scipy, with no samples: a kick, claps, snares and metallic
hats; a rolling bass and a sub that duck under the kick; plucked arpeggios through a dotted-eighth delay;
chords of detuned saws; a lead that carries the hook; impacts, risers, rolls and a hyperdrive into every
drop. D minor, lifting to F major for the residents and to D major at the end. A hall and a room, a
limiter, loudness about -14.5 LUFS with true peaks under -1 dBTP. ffmpeg writes AAC (score.m4a, also laid
under the rendered video) and Opus (score.webm, for browsers without AAC).
"""
import argparse
import functools
import pathlib
import re
import subprocess
import sys
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILM = ROOT / "demo" / "film"
SR = 48000
TAU = 2 * np.pi
BEAT = 0.5


# ---------------------------------------------------------------- the film's clock
def read_marks():
    text = (FILM / "film.js").read_text("utf-8")
    body = re.search(r"var M = \{(.*?)\};", text, re.S).group(1)
    return {k: float(v) for k, v in re.findall(r"(\w+):\s*([\d.]+)", body)}


M = read_marks()
DUR = M["end"]
LENGTH = int(round(DUR * SR))
GARDEN = M["cut"] + 28 * BEAT  # the bar line under the garden's first light


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
        w, d, x, z = lerp(220, 980, r()), lerp(260, 1400, r()), lerp(-2700, 2700, r()), r() * L
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


# ---------------------------------------------------------------- small tools
def db(x):
    return 10 ** (x / 20)


def hz(note):
    if not isinstance(note, str):
        return float(note)
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d)", note)
    semis = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[m[1]] + {"#": 1, "b": -1, "": 0}[m[2]]
    return 440.0 * 2 ** ((semis + 12 * (int(m[3]) + 1) - 69) / 12)


def times(n):
    return np.arange(n) / SR


def samples(seconds):
    return max(1, int(round(seconds * SR)))


def ease_io(p):
    p = np.clip(p, 0, 1)
    return np.where(p < 0.5, 4 * p ** 3, 1 - (-2 * p + 2) ** 3 / 2)


def ease_out(p):
    return 1 - (1 - np.clip(p, 0, 1)) ** 3


def edges(n, attack=0.004, release=0.02):
    e = np.ones(n)
    a, r = min(n, samples(attack)), min(n, samples(release))
    e[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    e[n - r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e


def swell(n, attack, release, curve=2.0):
    """Rise over `attack` seconds, hold, fall over `release` seconds at the end."""
    t = times(n)
    up = np.clip(t / max(attack, 1e-4), 0, 1) ** curve
    down = np.clip((n / SR - t) / max(release, 1e-4), 0, 1) ** 1.5
    return up * down


def pan2(x, pan=0.0):
    a = (np.clip(np.asarray(pan, float), -1, 1) + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)])


def norm(x):
    peak = np.max(np.abs(x))
    return x / peak if peak > 0 else x


def sos(kind, freq, order=2):
    return signal.butter(order, freq, kind, fs=SR, output="sos")


def shelf(freq, gain_db, q=0.7):
    """High shelf, as in the RBJ audio EQ cookbook: (b, a)."""
    a_ = 10 ** (gain_db / 40)
    w = TAU * freq / SR
    alpha = np.sin(w) / (2 * q)
    c = np.cos(w)
    b = [a_ * ((a_ + 1) + (a_ - 1) * c + 2 * np.sqrt(a_) * alpha), -2 * a_ * ((a_ - 1) + (a_ + 1) * c), a_ * ((a_ + 1) + (a_ - 1) * c - 2 * np.sqrt(a_) * alpha)]
    a = [(a_ + 1) - (a_ - 1) * c + 2 * np.sqrt(a_) * alpha, 2 * ((a_ - 1) - (a_ + 1) * c), (a_ + 1) - (a_ - 1) * c - 2 * np.sqrt(a_) * alpha]
    return np.array(b) / a[0], np.array(a) / a[0]


def lowpass(x, freq, order=2):
    return signal.sosfilt(sos("lowpass", freq, order), x, axis=-1)


def highpass(x, freq, order=2):
    return signal.sosfilt(sos("highpass", freq, order), x, axis=-1)


def bandpass(x, lo, hi, order=2):
    return signal.sosfilt(sos("bandpass", [lo, hi], order), x, axis=-1)


def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


NPER = 2048


def shape(x, mask_fn):
    """Filter in the time-frequency plane: mask_fn(freqs [F,1], frame_times [1,T]) -> gains."""
    f, t, z = signal.stft(x, SR, nperseg=NPER, noverlap=NPER * 3 // 4, boundary="even")
    gains = mask_fn(f[:, None], t[None, :])
    _, y = signal.istft(z * gains, SR, nperseg=NPER, noverlap=NPER * 3 // 4, boundary=True)
    out = np.zeros_like(x)
    m = min(x.shape[-1], y.shape[-1])
    out[..., :m] = y[..., :m]
    return out


def band(centre_fn, octaves=0.6):
    def mask(f, t):
        c = np.maximum(centre_fn(t), 20)
        return np.exp(-0.5 * (np.log2(np.maximum(f, 1) / c) / octaves) ** 2)
    return mask


def lowpass_moving(cutoff_fn, order=2):
    def mask(f, t):
        return 1 / np.sqrt(1 + (f / np.maximum(cutoff_fn(t), 30)) ** (2 * order))
    return mask


def reverse(x):
    return x[..., ::-1].copy()


def saw(freq, n, phase=0.0):
    """Band-limited sawtooth (polyBLEP); freq may vary per sample."""
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    dt = f / SR
    ph = (phase + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]
    y[m] -= x * x + x + x + 1
    return y


# ---------------------------------------------------------------- drums
@functools.lru_cache(maxsize=None)
def kick(punch=1.0, tone=52.0, dur=0.4, drive=2.4):
    """Four on the floor: a sine that drops from a punch to the fundamental, driven, with a click on top."""
    n = samples(dur)
    t = times(n)
    f = tone + 160 * punch * np.exp(-t / 0.024) + 34 * np.exp(-t / 0.09)
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    body = np.tanh(drive * body) / np.tanh(drive)
    clk = highpass(noise(n, 11), 2600) * np.exp(-t / 0.0015)
    return norm(body + 0.5 * clk) * edges(n, 0.0002, 0.04)


@functools.lru_cache(maxsize=None)
def clap(seed=21, tail=0.11):
    n = samples(0.42)
    t = times(n)
    env = np.zeros(n)
    for k, off in enumerate((0.0, 0.0095, 0.0205, 0.0295)):
        env += (t >= off) * np.exp(-np.clip(t - off, 0, None) / 0.0055) * (1 - 0.14 * k)
    env += 0.55 * (t >= 0.03) * np.exp(-np.clip(t - 0.03, 0, None) / tail)
    return norm(bandpass(noise(n, seed), 950, 6200) * env) * edges(n, 0.0002, 0.04)


@functools.lru_cache(maxsize=None)
def snare(seed=25, tone=220.0):
    n = samples(0.28)
    t = times(n)
    body = (np.sin(TAU * tone * t) + 0.5 * np.sin(TAU * tone * 1.78 * t)) * np.exp(-t / 0.05)
    rattle = bandpass(noise(n, seed), 1800, 9500) * np.exp(-t / 0.085)
    return norm(0.65 * body + rattle) * edges(n, 0.0002, 0.03)


HAT_F = (205.3, 304.4, 369.6, 522.7, 540.0, 800.0)


def metal(n, seed):
    """Six detuned square waves, as the classic drum machines make their cymbals."""
    t = times(n)
    rng = np.random.default_rng(seed)
    return sum(np.sign(np.sin(TAU * 2.0 * f * t + rng.random() * TAU)) for f in HAT_F)


@functools.lru_cache(maxsize=None)
def hat(open_=False, seed=31):
    n = samples(0.5 if open_ else 0.08)
    t = times(n)
    y = 0.55 * bandpass(metal(n, seed), 6500, 15000) + highpass(noise(n, seed), 8000, 4)
    return norm(y * np.exp(-t / (0.15 if open_ else 0.017))) * edges(n, 0.0002, 0.01)


@functools.lru_cache(maxsize=None)
def shaker(seed=41):
    n = samples(0.11)
    t = times(n)
    env = np.sin(np.pi * np.clip(t / 0.09, 0, 1)) ** 2
    return norm(bandpass(noise(n, seed), 4500, 12000) * env)


@functools.lru_cache(maxsize=None)
def ride(seed=311):
    n = samples(0.7)
    t = times(n)
    bell = sum(a * np.sin(TAU * f * t) for f, a in ((2950, 1.0), (4330, 0.6), (5470, 0.4), (7120, 0.25))) * np.exp(-t / 0.28)
    return norm(0.35 * bell + highpass(noise(n, seed), 5500) * np.exp(-t / 0.2)) * edges(n, 0.0002, 0.05)


@functools.lru_cache(maxsize=None)
def rim(seed=321):
    n = samples(0.07)
    t = times(n)
    y = np.sin(TAU * 1720 * t) * np.exp(-t / 0.009) + 0.5 * bandpass(noise(n, seed), 2000, 9000) * np.exp(-t / 0.003)
    return norm(y) * edges(n, 0.0001, 0.01)


@functools.lru_cache(maxsize=None)
def tom(freq=110.0, dur=0.55, seed=331):
    n = samples(dur)
    t = times(n)
    f = freq * (1 + 0.6 * np.exp(-t / 0.03))
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.2) + 0.25 * bandpass(noise(n, seed), 400, 3500) * np.exp(-t / 0.03)
    return norm(np.tanh(1.6 * y)) * edges(n, 0.0002, 0.04)


@functools.lru_cache(maxsize=None)
def crash(dur=2.8, seed=301):
    n = samples(dur)
    t = times(n)
    y = highpass(noise(n, seed), 3600, 2) + 0.45 * bandpass(metal(n, seed + 1), 3000, 13000)
    env = np.exp(-t / 0.95) * (0.35 + 0.65 * np.exp(-t / 0.07))
    return norm(y * env) * edges(n, 0.0004, 0.4)


@functools.lru_cache(maxsize=None)
def boom(dur=3.2, low=38.0, high=82.0, tau=1.2):
    """A sub that falls from a punch to the floor: the weight under a cut."""
    n = samples(dur)
    t = times(n)
    f = low + (high - low) * np.exp(-t / 0.16)
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / tau)
    return norm(np.tanh(1.7 * y)) * edges(n, 0.0008, 0.25)


@functools.lru_cache(maxsize=None)
def burst(dur=1.2, seed=341, cutoff=3000.0, tau=0.2):
    n = samples(dur)
    t = times(n)
    return norm(lowpass(noise(n, seed), cutoff) * np.exp(-t / tau)) * edges(n, 0.0004, 0.1)


# ---------------------------------------------------------------- the synths
@functools.lru_cache(maxsize=None)
def voice(f, dur, peak, base, tau, decay=0.0, odd=False, release=0.02, attack=0.002, seed=0):
    """Additive saw (or square) through a low-pass whose cutoff falls from `peak` to `base` (x f) with time
    constant `tau`: the filter envelope of an analogue synth, one harmonic at a time."""
    n = samples(dur)
    t = times(n)
    fc = f * (base + (peak - base) * np.exp(-t / tau))
    rng = np.random.default_rng(seed)
    y = np.zeros(n)
    for k in range(1, int(min(64, SR * 0.45 / f)) + 1):
        if odd and k % 2 == 0:
            continue
        y += (1.0 / k) / np.sqrt(1 + (k * f / fc) ** 4) * np.sin(TAU * f * k * t + rng.random() * 0.4)
    env = edges(n, attack, release)
    if decay:
        env = env * np.exp(-t / decay)
    return 0.6 * y * env


def pluck(f, dur=0.32, bright=1.0, decay=0.16):
    """The arpeggio: a bright pluck that closes fast."""
    return voice(round(f, 3), dur, 16 * bright, 2.2, 0.05, decay, False, 0.03)


def bass_note(f, dur=0.115, bright=1.0):
    return voice(round(f, 3), dur, 24 * bright, 3.5, 0.035, 0.0, False, 0.012, 0.0015)


def blip(f, dur=0.045):
    """A bit of data: a square wave that is gone almost before it is heard."""
    return voice(round(f, 3), dur, 30, 6, 0.01, 0.012, True, 0.005, 0.0005)


@functools.lru_cache(maxsize=None)
def mallet(f, dur=0.9, decay=0.32):
    """The residents' tune: a struck bar, bright and wooden."""
    n = samples(dur)
    t = times(n)
    y = np.sin(TAU * f * t) * np.exp(-t / decay) + 0.42 * np.sin(TAU * f * 3.98 * t) * np.exp(-t / (decay * 0.22))
    y += 0.12 * np.sin(TAU * f * 9.1 * t) * np.exp(-t / (decay * 0.07))
    y += 0.3 * highpass(noise(n, int(f)), 3000) * np.exp(-t / 0.0025)
    return norm(y) * edges(n, 0.0006, 0.04)


@functools.lru_cache(maxsize=None)
def glass(f=2600.0, dur=1.2, decay=0.3, seed=0):
    n = samples(dur)
    t = times(n)
    rng = np.random.default_rng(seed)
    y = np.zeros(n)
    for ratio, amp, d in ((1, 1, 1), (2.32, 0.62, 0.55), (4.25, 0.36, 0.32), (6.63, 0.2, 0.2)):
        if f * ratio < SR * 0.45:
            y += amp * np.sin(TAU * f * ratio * t + rng.random() * TAU) * np.exp(-t / (decay * d))
    return norm(y) * edges(n, 0.0006, 0.03)


@functools.lru_cache(maxsize=None)
def supersaw(notes, dur, cutoff=7000.0, attack=0.012, release=0.3, voices=7, detune=0.24, seed=1):
    """Seven detuned saws to a note, spread across the stereo field."""
    n = samples(dur)
    rng = np.random.default_rng(seed)
    out = np.zeros((2, n))
    for note in notes:
        f0 = hz(note)
        for v in range(voices):
            u = v / (voices - 1) * 2 - 1
            out += pan2(saw(f0 * 2 ** (detune * u / 12), n, rng.random()), 0.85 * u)
    out = lowpass(out, cutoff, 2)
    return out / np.sqrt(len(notes) * voices) * edges(n, attack, release)


@functools.lru_cache(maxsize=None)
def stab(notes, dur=0.26, cutoff=6500.0):
    """A chord, struck short."""
    s = supersaw(notes, dur, cutoff, 0.002, 0.06, 5, 0.18, 7)
    return s * np.exp(-times(s.shape[1]) / 0.1)


@functools.lru_cache(maxsize=None)
def lead_note(f, dur):
    """The hook: two saws a hair apart over a third an octave down, a breath of vibrato on the long notes."""
    n = samples(dur + 0.25)
    t = times(n)
    vib = 1 + 0.0035 * np.sin(TAU * 5.6 * t) * np.clip((t - 0.16) / 0.25, 0, 1)
    y = saw(f * vib * 1.0028, n, 0.13) + saw(f * vib * 0.9972, n, 0.71) + 0.55 * saw(f * vib / 2, n, 0.37)
    y = lowpass(y, min(9000.0, f * 8), 2)
    env = np.where(t < dur, 0.82 + 0.18 * np.exp(-t / 0.07), (0.82 + 0.18 * np.exp(-dur / 0.07)) * np.exp(-(t - dur) / 0.06))
    return norm(y) * env * edges(n, 0.004, 0.02)


# ---------------------------------------------------------------- sound for the picture
@functools.lru_cache(maxsize=None)
def thump(dur=0.5, freq=78.0, tau=0.12):
    n = samples(dur)
    t = times(n)
    f = freq * (1 + 0.8 * np.exp(-t / 0.02))
    return norm(np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / tau)) * edges(n, 0.0008, 0.05)


@functools.lru_cache(maxsize=None)
def click(freq=2600.0, dur=0.05, seed=51, body=0.4):
    n = samples(dur)
    t = times(n)
    y = highpass(noise(n, seed), 1500) * np.exp(-t / 0.0018)
    y += body * np.sin(TAU * freq * t) * np.exp(-t / 0.012)
    return norm(y) * edges(n, 0.0003, 0.01)


def key_tap(seed=61):
    n = samples(0.09)
    t = times(n)
    y = 0.7 * np.sin(TAU * 190 * t) * np.exp(-t / 0.018) + bandpass(noise(n, seed), 1200, 7000) * np.exp(-t / 0.004)
    return norm(y)


def whoosh(dur, f0, f1, peak=0.55, octaves=0.75, seed=71, curve=1.6):
    """Noise through a band that glides from f0 to f1, rising to a peak and falling away."""
    n = samples(dur)
    x = noise(n, seed)
    y = shape(x, band(lambda t: f0 * (f1 / f0) ** np.clip(t / dur, 0, 1), octaves))
    t = times(n)
    p = t / dur
    env = np.where(p < peak, (p / peak) ** curve, ((1 - p) / (1 - peak)) ** 1.3)
    return norm(y * env)


def riser(dur, f0=260, f1=7000, tone=(196, 1568), seed=81, curve=2.4):
    n = samples(dur)
    t = times(n)
    p = t / dur
    x = shape(noise(n, seed), band(lambda tt: f0 * (f1 / f0) ** np.clip(tt / dur, 0, 1) ** 1.6, 0.9))
    g = tone[0] * (tone[1] / tone[0]) ** (p ** 1.5)
    y = norm(x) + 0.32 * np.sin(TAU * np.cumsum(g) / SR) + 0.12 * saw(g * 1.5, n, 0.2)
    return norm(y * p ** curve) * edges(n, 0.01, 0.004)


def zap(dur=0.5, f0=2600, f1=520, seed=91):
    """Light in flight: a falling glide over a breath of noise."""
    n = samples(dur)
    t = times(n)
    p = t / dur
    g = f0 * (f1 / f0) ** (p ** 0.7)
    tone = np.sin(TAU * np.cumsum(g) / SR) + 0.3 * np.sin(2 * TAU * np.cumsum(g) / SR)
    air = shape(noise(n, seed), band(lambda tt: 5000 * (1200 / 5000) ** np.clip(tt / dur, 0, 1), 0.7))
    env = np.clip(p / 0.08, 0, 1) * (1 - p) ** 1.4
    return norm((0.55 * tone + norm(air)) * env)


def pew(dur=0.16, f0=3400, f1=1500, seed=95):
    n = samples(dur)
    t = times(n)
    g = f0 * (f1 / f0) ** (t / dur)
    return norm(np.sin(TAU * np.cumsum(g) / SR) * np.exp(-t / 0.05) * edges(n, 0.001, 0.02))


def scratch(dur=0.8, seed=101):
    """A felt pen on glass: bursts of filtered noise, one per tiny stroke."""
    n = samples(dur)
    t = times(n)
    rng = np.random.default_rng(seed)
    rate = 34 + 10 * np.sin(TAU * 1.3 * t)
    strokes = 0.55 + 0.45 * np.sin(TAU * np.cumsum(rate) / SR + rng.random()) ** 2
    y = bandpass(noise(n, seed), 2200, 7600) * strokes
    y += 0.4 * bandpass(noise(n, seed + 1), 700, 1600) * strokes
    return norm(y * swell(n, 0.05, 0.12, 1))


def sparkle(dur, rate, f_lo, f_hi, seed=111, decay=0.16, density=None):
    """A cloud of tiny pings."""
    n = samples(dur)
    out = np.zeros((2, n))
    rng = np.random.default_rng(seed)
    t = 0.0
    while t < dur:
        d = density(t / dur) if density else 1.0
        t += rng.exponential(1 / max(rate * d, 1e-3))
        if t >= dur:
            break
        ping = glass(round(f_lo * (f_hi / f_lo) ** rng.random(), 1), 0.45, round(decay * (0.6 + 0.8 * rng.random()), 3), int(rng.integers(64)))
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
    glide = 220 * (2600 / 220) ** (p ** 1.4)
    mono = mono + 0.35 * np.sin(TAU * np.cumsum(glide) / SR)
    env = (0.03 + 0.97 * p ** 3) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.14))
    w = p ** 2
    return (pan2(mono * (1 - 0.7 * w), 0) + 0.8 * wide * w) * env * edges(n, 0.005, 0.05)


def hyperdrive(dur=1.2, seed=520):
    """The jump: a whine that climbs through the octaves over a rushing of air, cut on the downbeat."""
    n = samples(dur)
    t = times(n)
    p = t / dur
    f = 110 * (2200 / 110) ** (p ** 1.6)
    tone = lowpass(saw(f, n, 0.0) + 0.5 * saw(f * 1.5, n, 0.3), 6500)
    air = shape(noise(n, seed), band(lambda tt: 500 * (10000 / 500) ** np.clip(tt / dur, 0, 1) ** 1.4, 1.0))
    return norm((0.45 * norm(tone) + norm(air)) * p ** 2.2) * edges(n, 0.01, 0.003)


def power_down(notes=("D2", "A2", "D3"), dur=0.62):
    """One more thing: the music winds down like a machine switched off."""
    n = samples(dur)
    t = times(n)
    p = t / dur
    drop = 1 - 0.86 * p ** 0.75
    y = sum(saw(hz(nn) * drop, n, 0.17 * i) for i, nn in enumerate(notes))
    y = shape(y, lowpass_moving(lambda tt: 4000 * (220 / 4000) ** np.clip(tt / dur, 0, 1), 2))
    return norm(y) * (1 - p) ** 1.3 * edges(n, 0.002, 0.05)


# ---------------------------------------------------------------- the mix
class Bus:
    def __init__(self):
        self.x = np.zeros((2, LENGTH + samples(6)))

    def add(self, sig, t, gain_db=0.0, pan=0.0):
        s = sig if sig.ndim == 2 else pan2(sig, pan)
        i = int(round(t * SR))
        j = i + s.shape[1]
        a, b = max(i, 0), min(j, self.x.shape[1])
        if b > a:
            self.x[:, a:b] += db(gain_db) * s[:, a - i:b - i]

    def end_at(self, sig, t, gain_db=0.0, pan=0.0):
        """Place a sound so that it ends at t (for things played backwards)."""
        self.add(sig, t - sig.shape[-1] / SR, gain_db, pan)


# drums; the rolling bass; the sub and the chords (both duck under the kick); arpeggios; the lead; sound for
# the picture; the weight under the cuts
drums, bass, sub, chords, arps, lead, sfx, big = (Bus() for _ in range(8))
KICKS = []


# ---------------------------------------------------------------- harmony
VOICE = {
    "Dm": ("D3", "A3", "D4", "F4", "A4"), "Dm9": ("D3", "A3", "E4", "F4", "C5"),
    "Bb": ("Bb2", "F3", "Bb3", "D4", "F4"), "Bbmaj7": ("Bb2", "F3", "A3", "D4", "F4"),
    "F": ("F3", "C4", "F4", "A4", "C5"), "C": ("C3", "G3", "C4", "E4", "G4"), "Csus": ("C3", "G3", "C4", "F4", "G4"),
    "A": ("A2", "E3", "A3", "C#4", "E4"),
    "D": ("D3", "A3", "D4", "F#4", "A4"), "Bm": ("B2", "F#3", "B3", "D4", "F#4"), "G": ("G2", "D3", "G3", "B3", "D4"),
}
BASS_ROOT = {"Dm": "D2", "Dm9": "D2", "Bb": "Bb1", "Bbmaj7": "Bb1", "F": "F2", "C": "C2", "Csus": "C2", "A": "A1",
        "D": "D2", "Bm": "B1", "G": "G1"}


def progression():
    """The chord under every moment, on the bar lines of the grid."""
    m = M
    seq = [(0.0, "Dm9"), (m["press1"], "Bbmaj7"), (m["press1"] + 2, "C"),
           (m["press2"], "Dm"), (m["press2"] + 2, "Bb"), (m["press2"] + 3, "C"), (m["press2"] + 4, "Csus"),
           (m["flash"], "F"), (m["flash"] + 1, "C"), (m["flash"] + 2, "Dm"), (m["flash"] + 3, "Bb"),
           (m["bench"], "Dm"), (m["bench"] + 2, "Bb"), (m["bench"] + 4, "F"), (m["implode"], "C"),
           (m["launch"], "Dm"), (m["launch"] + 2, "Bb"), (m["fly"], "C"),
           (m["slit"], "Dm9"), (m["open"] + 2, "Bb"),
           (m["rise"], "Bbmaj7"), (m["rise"] + 1, "C"),
           (m["jump"], "Dm"), (m["jump"] + 1, "Bb"), (m["jump"] + 2, "F"), (m["jump"] + 3, "C")]
    seq += [(m["back"] + 2 * i, c) for i, c in enumerate(["Dm", "Bb", "F", "C"])] + [(m["back"] + 8, "Dm"), (m["back"] + 9, "Bb")]
    seq += [(m["console"], "Bb"), (m["console"] + 2, "F"), (m["console"] + 4, "C")]
    seq += [(m["pillars"] + 0.5 * k, c) for k, c in enumerate(["Dm", "Bb", "F", "C"])]
    seq += [(m["converge"], "Bb"), (m["point"], "Csus"), (m["point"] + 1.5, "C"),
            (m["lock"], "F"), (m["lock"] + 1, "C"), (m["lock"] + 2, "Dm"), (m["lock"] + 3, "Bb"), (m["dark"], None)]
    seq += [(m["cut"], "F"), (m["cut"] + 4, "Dm"), (m["cut"] + 6, "Bb"), (m["cut"] + 8, "C"), (m["cut"] + 10, "F"), (m["cut"] + 12, "C"),
            (GARDEN, "Bbmaj7"), (GARDEN + 2, "F"), (GARDEN + 3, "C")]
    seq += [(m["device"] + o, c) for o, c in ((0, "Dm"), (2, "Bb"), (4, "F"), (5, "C"), (6, "Dm"), (7, "Bb"))]
    seq += [(m["tag"], "Bb"), (m["tag"] + 1, "A")]
    seq += [(m["flash2"] + o, c) for o, c in ((0, "D"), (1, "A"), (2, "Bm"), (3, "G"), (4, "D"))] + [(DUR, None)]
    return sorted(seq)


PROG = progression()


def chord_at(t):
    name = None
    for start, c in PROG:
        if start <= t + 1e-9:
            name = c
    return name


def spans(a, b):
    """The chords between a and b, as (start, end, name)."""
    out = []
    for k, (s, name) in enumerate(PROG[:-1]):
        e = PROG[k + 1][0]
        s2, e2 = max(s, a), min(e, b)
        if name and e2 > s2 + 1e-6:
            out.append((s2, e2, name))
    return out


def arp_notes(name, octave=0):
    v = [hz(x) * 2 ** octave for x in VOICE[name]]
    tones = [v[2], v[3], v[4], 2 * v[2], 2 * v[3], 2 * v[4]]
    return [tones[i] for i in (0, 2, 1, 3, 2, 4, 3, 5)]


# The hook: one cell of two beats to a chord, (beat, note, beats).
CELL = {
    "Dm": ((0, "A4", .5), (.5, "D5", .5), (1, "F5", .5), (1.5, "E5", .25), (1.75, "D5", .25)),
    "Bb": ((0, "D5", .75), (.75, "F5", .5), (1.25, "D5", .25), (1.5, "C5", .5)),
    "F": ((0, "C5", .5), (.5, "F5", .5), (1, "A5", .75), (1.75, "G5", .25)),
    "C": ((0, "G5", .75), (.75, "E5", .5), (1.25, "D5", .25), (1.5, "E5", .5)),
    "D": ((0, "A4", .5), (.5, "D5", .5), (1, "F#5", .5), (1.5, "E5", .25), (1.75, "D5", .25)),
    "A": ((0, "C#5", .75), (.75, "E5", .5), (1.25, "C#5", .25), (1.5, "A4", .5)),
    "Bm": ((0, "B4", .5), (.5, "D5", .5), (1, "F#5", .75), (1.75, "E5", .25)),
    "G": ((0, "B4", .5), (.5, "D5", .5), (1, "G5", .75), (1.75, "F#5", .25)),
}


# ---------------------------------------------------------------- composing
def kick_at(t, gain=-6.0, punch=1.0, pump=True):
    drums.add(kick(punch), t, gain)
    if pump:
        KICKS.append((t, min(1.0, db(gain + 6))))


def groove(a, b, style, g=0.0, crash_at_start=False):
    """Drums from a to b; a falls on a bar line."""
    if crash_at_start:
        drums.add(crash(), a, -15 + g, 0.15)
    t = a
    while t < b - 1e-6:
        pos = int(round((t - a) / 0.125))
        beat, sub_ = divmod(pos, 4)
        bb = beat % 4
        if style == "tick":
            drums.add(hat(seed=31 + pos % 8), t, (-30 if sub_ == 0 else -35) + g, 0.25)
        elif style == "heart":
            if sub_ == 0:
                kick_at(t, -13 + g, 0.7, False)
            drums.add(hat(seed=31 + pos % 8), t, (-29 if sub_ == 0 else -34) + g, 0.25)
        elif style == "half":
            if pos % 16 in (0, 10):
                kick_at(t, -7 + g)
            if pos % 16 == 8:
                drums.add(clap(21 + pos % 4), t, -12 + g)
            drums.add(hat(seed=31 + pos % 8), t, (-25 if sub_ == 2 else -30) + g, 0.3)
        elif style in ("drive", "full"):
            if sub_ == 0:
                kick_at(t, -6 + g)
            if sub_ == 0 and bb in (1, 3):
                drums.add(clap(21 + pos % 4), t, -10 + g)
                drums.add(snare(25 + pos % 3), t, -19 + g)
            if sub_ == 2:
                drums.add(hat(True, seed=33 + pos % 4), t, -20 + g, -0.2)
            else:
                drums.add(hat(seed=31 + pos % 8), t, (-23 if sub_ == 0 else -27) + g, 0.3)
            if style == "full":
                if pos % 16 in (3, 6, 11, 14):
                    drums.add(rim(321 + pos % 4), t, -24 + g, -0.35)
                if sub_ == 0:
                    drums.add(ride(311), t, -28 + g, 0.4)
        elif style == "bounce":
            if pos % 16 in (0, 6, 8) or pos % 32 == 30:
                kick_at(t, -8 + g, 0.9)
            if pos % 16 in (4, 12):
                drums.add(clap(27 + pos % 3, 0.05), t, -13 + g, 0.1)
            drums.add(shaker(41 + pos % 6), t, (-24 if sub_ == 2 else -29) + g, 0.25)
            if pos % 16 in (7, 15):
                drums.add(rim(325 + pos % 2), t, -23 + g, -0.3)
        elif style == "soft":
            if pos % 16 == 0:
                kick_at(t, -14 + g, 0.7)
            if sub_ % 2 == 0:
                drums.add(shaker(41 + pos % 6), t, (-27 if sub_ == 2 else -31) + g, 0.25)
        t += 0.125


def roll(a, b, g0=-26.0, g1=-10.0, kicks=False):
    """A build: snare hits in eighths, then sixteenths, then thirty-seconds, louder and higher."""
    t, k = a, 0
    while t < b - 1e-6:
        p = (t - a) / (b - a)
        drums.add(snare(25 + k % 3, round(196 * 2 ** p, 1)), t, g0 + (g1 - g0) * p, 0.06 * np.sin(k))
        if kicks and abs(((t - a) / 0.25) - round((t - a) / 0.25)) < 1e-6:
            kick_at(t, -9 + 3 * p, 0.8 + 0.3 * p)
        t += 0.25 if p < 0.5 else 0.125 if p < 0.8 else 0.0625
        k += 1


def bassline(a, b, style, g=0.0, bright=1.0):
    t = a
    while t < b - 1e-6:
        pos = int(round((t - a) / 0.125))
        sub_ = pos % 4
        name = chord_at(t)
        if name:
            f = hz(BASS_ROOT[name])
            if style == "roll":
                bass.add(bass_note(f * (2 if sub_ == 2 else 1), 0.115, bright), t, -11 + g + (1.5 if sub_ == 0 else 0))
            elif style == "off" and sub_ == 2:
                bass.add(bass_note(f * 2, 0.21, 1.3 * bright), t, -9 + g)
            elif style == "bounce" and pos % 16 in (0, 3, 6, 8, 11, 14):
                bass.add(bass_note(f * (2 if pos % 16 in (6, 14) else 1), 0.17, bright), t, -10 + g)
            elif style == "pulse" and sub_ % 2 == 0:
                bass.add(bass_note(f, 0.2, 0.7 * bright), t, -12 + g)
        t += 0.125


def low(a, b, g=-12.0):
    """The sub: one sine on the root, under the whole chord."""
    for s, e, name in spans(a, b):
        n = samples(e - s + 0.04)
        f = hz(BASS_ROOT[name])
        sub.add(np.sin(TAU * f * times(n)) * edges(n, 0.012, 0.04), s, g)


def pads(a, b, g=-17.0, cutoff=7000.0, octave=0):
    for s, e, name in spans(a, b):
        notes = tuple(n_[:-1] + str(int(n_[-1]) + octave) for n_ in VOICE[name])
        chords.add(supersaw(notes, round(e - s + 0.3, 3), cutoff, 0.012, 0.3, 7, 0.24, int(s * 10) % 97), s, g)


def stabs(a, b, where, g=-15.0, octave=1):
    """Chords struck on the off-beats of a two-bar figure (positions in sixteenths)."""
    t = a
    while t < b - 1e-6:
        pos = int(round((t - a) / 0.125))
        if pos % 32 in where and chord_at(t):
            notes = tuple(n_[:-1] + str(int(n_[-1]) + octave) for n_ in VOICE[chord_at(t)][1:4])
            chords.add(stab(notes), t, g)
        t += 0.125


def arpeggio(a, b, g=-20.0, octave=0, bright=1.0, step=0.125, ramp=None):
    t, i = a, 0
    while t < b - 1e-6:
        name = chord_at(t)
        if name:
            f = arp_notes(name, octave)[i % 8]
            level = g + (0 if i % 4 == 0 else -2.5) + (ramp((t - a) / (b - a)) if ramp else 0)
            arps.add(pluck(f, 0.32, bright), t, level, 0.32 * np.sin(i * 0.77))
        t += step
        i += 1


def hook(a, names, g=-12.0, until=None):
    for k, name in enumerate(names):
        for beat, note, length in CELL[name]:
            t0 = a + k + beat * BEAT
            if until is not None and t0 >= until - 1e-6:
                return
            dur = length * BEAT * 0.9
            if until is not None:
                dur = min(dur, until - t0 - 0.02)
            lead.add(lead_note(hz(note), round(dur, 4)), t0, g, 0.0)


def hit(t, size=1.0, crash_=True, g=0.0):
    """The weight under a cut: a falling sub, a burst, a crash."""
    big.add(boom(2.6 + size, 38, 86, 0.6 + 0.5 * size), t, -13 + 3 * size + g)
    big.add(burst(1.0, int(t * 10), 2600, 0.12 + 0.12 * size), t, -17 + 3 * size + g)
    kick_at(t, -5 + g, 1.1)
    if crash_:
        drums.add(crash(2.8, 301 + int(t) % 5), t, -13 + 2 * size + g, 0.1)


def lift_into(t, length=1.0, g=0.0):
    """Into a downbeat: a reversed cymbal and a rising swell that end exactly on it."""
    swell_in = reverse(crash(length + 0.4, 307)[: samples(length)]) * np.linspace(0, 1, samples(length)) ** 2
    sfx.end_at(swell_in, t, -15 + g, -0.1)


def compose():
    m = M
    shots = laser_shots()

    # ---- once upon a time: a point of light, a ring drawn round it, a pulse that quickens
    n = samples(m["press1"] + 0.3)
    tt = times(n)
    drone = (0.45 * np.sin(TAU * hz("D1") * tt) + np.sin(TAU * hz("D2") * tt + 1) + 0.12 * saw(hz("A2"), n, 0.3)) * np.clip(tt / 1.2, 0, 1) ** 2
    sub.add(np.tanh(1.3 * drone) * edges(n, 0.01, 0.3), 0.0, -19)
    groove(0.5, 2.0, "tick", -2)
    groove(2.0, m["press1"], "heart", 0)
    sfx.add(glass(hz("D7"), 1.4, 0.4, 1), m["photon"], -22, 0.0)
    sfx.add(thump(0.6, 55, 0.2), m["photon"], -18)
    draw_n = samples(m["draw1"] - m["draw0"] + 0.3)
    tt = times(draw_n)
    prog = ease_io(tt / (m["draw1"] - m["draw0"]))
    drawing = np.sin(TAU * np.cumsum(900 + 1500 * prog) / SR) * 0.25 + norm(shape(noise(draw_n, 5), band(lambda t: 6500 + 0 * t, 0.5)))
    sfx.add(pan2(norm(drawing) * swell(draw_n, 0.25, 0.35, 1.2), 0.5 * np.cos(-np.pi / 2 + prog * TAU)), m["draw0"], -31)
    arpeggio(m["draw0"] - 0.1, m["press1"], -21, 0, 0.8, ramp=lambda p: -10 * (1 - p))
    for i, note in enumerate(("D4", "A4", "C5", "E5", "F5")):  # the ring closes
        arps.add(pluck(hz(note), 0.9, 1.2, 0.5), m["draw1"] + 0.012 * i, -19, -0.4 + 0.2 * i)
    sfx.add(glass(hz("A6"), 1.6, 0.6, 2), m["draw1"], -25, 0.1)
    roll(m["press1"] - 1.0, m["press1"], -30, -17)
    lift_into(m["press1"], 0.75, -4)

    # ---- the Home button: pressed, the camera dives to its rim
    P1, P2 = m["press1"], m["press2"]
    hit(P1, 0.6, False, -3)
    sfx.add(click(2794, 0.05, 7), P1 + 0.012, -20)
    sfx.add(whoosh(1.4, 1600, 170, 0.12, 0.9, seed=40), P1, -22)
    groove(P1, P2, "half", -1)
    bassline(P1, P2, "roll", -3, 0.7)
    low(P1, P2, -15)
    pads(P1, P2, -24, 2600)
    chords.add(stab(("A4", "D5", "F5")), m["home"] + 0.5, -15)  # the name appears
    sfx.add(click(3400, 0.04, 9, 0.6), m["home"] + 0.55, -24, 0.35)  # the small button inside the arc
    sfx.add(glass(hz("D7"), 0.8, 0.25, 3), m["home"] + 0.7, -28, 0.4)
    for i in range(10):  # a bead of light runs the length of the arc
        tb = m["home"] + 1.0 + 0.125 * i
        arps.add(pluck(arp_notes(chord_at(tb), 1)[i % 8], 0.3, 1.3), tb, -21 + 0.6 * i, -0.7 + 0.16 * i)
    sfx.end_at(reverse(whoosh(0.7, 3000, 400, 0.2, 0.7, seed=14)), P2 - 0.02, -21)
    roll(P2 - 0.5, P2, -24, -14)

    # ---- pressed again: the light pours out; the ring becomes a screen; a flash
    hit(P2, 1.0, True, 0)
    sfx.add(click(2637, 0.05, 8), P2 + 0.012, -18)
    sfx.add(whoosh(1.8, 900, 160, 0.12, 0.9, seed=41), P2, -19)
    groove(P2, m["flash"] - 0.5, "drive", -1)
    bassline(P2, m["flash"] - 0.5, "roll", -1)
    low(P2, m["flash"] - 0.5, -13)
    arpeggio(P2, m["flash"] - 0.5, -20, 0, 1.0)
    pads(P2, m["flash"], -20, 4200)
    stabs(P2, m["flash"] - 1, (3, 6, 10, 19, 22, 26), -17)
    music_riser = riser(m["flash"] - m["morph"], 240, 9000, (147, 1175), seed=15)
    sfx.add(music_riser, m["morph"], -17)
    roll(m["flash"] - 2.0, m["flash"], -24, -8)
    lift_into(m["flash"], 1.0)

    # ---- a flash into the light: a place, made out of the promise
    F0 = m["flash"]
    hit(F0, 1.4, True, 0)
    groove(F0, m["bench"], "full", 0)
    drums.add(crash(2.4, 302), F0 + 2, -17, -0.2)
    bassline(F0, m["bench"], "off", 0)
    low(F0, m["bench"], -11)
    pads(F0, m["bench"], -15, 8000)
    arpeggio(F0, m["bench"], -21, 1, 1.1)
    hook(F0, ["F", "C", "Dm", "Bb"], -9)
    sfx.add(whoosh(1.1, 2500, 5200, 0.5, 0.6, seed=18), F0 + 0.9, -30, 0)

    # ---- the workbench: a line of light assembles it; its layers come apart and go back together
    B0 = m["bench"]
    groove(B0, m["implode"] + 0.5, "drive", -4)
    bassline(B0, m["implode"] + 0.5, "roll", -2)
    low(B0, m["implode"] + 0.5, -14)
    arpeggio(B0, m["implode"] + 0.5, -18, 0, 0.9)
    pads(B0, m["launch"], -24, 3200)
    scan = B0 + 0.05, B0 + 1.75
    n = samples(scan[1] - scan[0] + 0.4)
    tt = times(n)
    pos = np.clip(ease_io(tt / (scan[1] - scan[0])), 0, 1)
    hum = (np.sin(TAU * 1760 * tt) * 0.25 + norm(shape(noise(n, 19), band(lambda t: 3000 + 2500 * np.clip(t / 1.7, 0, 1), 0.6)))) * swell(n, 0.2, 0.45, 1)
    sfx.add(pan2(norm(hum), pos * 1.6 - 0.8), scan[0], -29)
    for x in (200, 416, 511, 605, 633, 650, 755, 1167, 1222, 1249, 1271, 1320):
        p = min(1, max(0, (x + 80) / 1680))
        u = np.cbrt(p / 4) if p < 0.5 else 1 - np.cbrt(2 * (1 - p)) / 2
        sfx.add(click(2200 + x, 0.04, int(x), 0.5), scan[0] + u * (scan[1] - scan[0]), -31, pan=(x / 1560) * 1.6 - 0.8)
    E0 = m["explode"]
    sfx.add(whoosh(1.6, 180, 1200, 0.55, 0.8, seed=20), E0 + 0.2, -22)
    for i in range(4):  # four layers part
        chords.add(stab(tuple(n_[:-1] + str(int(n_[-1]) + 1) for n_ in VOICE["Bb"][1 + (i % 2):4 + (i % 2)])), E0 + 0.5 + 0.25 * i, -16 + i, 0.3 * (i - 1.5))
        drums.add(tom(98 + 22 * i), E0 + 0.5 + 0.25 * i, -15)
    for i in range(4):  # and are named
        sfx.add(click(2400 + 200 * i, 0.04, 30 + i, 0.6), E0 + 1.4 + 0.16 * i, -27, pan=0.6)
    sfx.end_at(reverse(whoosh(1.0, 900, 180, 0.3, 0.8, seed=22)), m["implode"] + 0.9, -21)
    sfx.add(click(1800, 0.06, 23, 0.8), m["implode"] + 0.9, -21)
    sfx.add(thump(0.4, 110, 0.1), m["implode"] + 0.9, -20)

    # ---- the launch pad: words typed, light in flight to the arrow, and into the arrow
    L0 = m["launch"]
    groove(L0, m["warp"], "drive", -1.5)
    bassline(L0, m["warp"], "roll", -1, 1.1)
    low(L0, m["warp"], -13)
    arpeggio(L0, m["warp"], -18, 0, 1.0)
    stabs(L0, m["fly"], (3, 6, 10, 19, 22, 26), -18)
    sfx.add(whoosh(0.9, 700, 2400, 0.5, 0.7, seed=24), L0 + 0.05, -26)
    for k in range(5):
        sfx.add(key_tap(60 + k), m["type"] + 0.25 * k, -19 + (k % 2), pan=-0.15 + 0.07 * k)
    sfx.add(zap(0.55, 2400, 700, 25), m["fly"], -16, 0.2)
    sfx.add(glass(hz("A6"), 1.4, 0.4, 26), m["fly"] + 0.52, -20, 0.35)
    roll(m["warp"], m["slit"], -20, -9, kicks=True)
    sfx.add(riser(m["slit"] - m["warp"] + 0.05, 500, 11000, (440, 3520), seed=27, curve=1.6), m["warp"] - 0.05, -16)

    # ---- the narrow way: a thread of light, a heartbeat; then a door edged in every colour
    S0, O0 = m["slit"], m["open"]
    n = samples(O0 - S0 + 0.3)
    tt = times(n)
    thread = (np.sin(TAU * hz("A6") * tt) + 0.35 * np.sin(TAU * hz("E7") * tt + 1)) * (1 + 0.2 * np.sin(TAU * 8 * tt))
    sfx.add(norm(thread) * swell(n, 0.2, 0.3, 1.2), S0, -27)
    for b0 in (S0, S0 + 0.5):
        drums.add(lowpass(kick(0.6), 900), b0, -12)
    lift_into(O0, 0.9, 2)
    sfx.add(riser(O0 - S0, 300, 6000, (220, 880), seed=28, curve=3.0), S0, -20)

    hit(O0, 1.0, True, 0)
    sfx.add(whoosh(1.4, 500, 12000, 0.35, 1.1, seed=30), O0 - 0.15, -18)
    for i, note in enumerate(["D4", "E4", "F4", "A4", "C5", "D5", "E5", "F5", "A5", "C6", "D6", "E6"]):  # every colour
        arps.add(pluck(hz(note), 0.6, 1.3, 0.3), O0 + 0.03 * i, -20 + 0.4 * i, -0.8 + 0.145 * i)
    pads(O0, m["rise"], -18, 6000)
    groove(O0, m["rise"] - 0.5, "drive", -0.5)
    bassline(O0, m["rise"], "roll", -0.5, 1.2)
    low(O0, m["rise"], -12)
    arpeggio(O0, m["rise"], -19, 1, 1.0)
    rng = np.random.default_rng(310)  # data: the cores light, the pulses race to the city
    penta = [hz(x) for x in ("D6", "F6", "G6", "A6", "C7", "D7")]
    t = O0 + 0.5
    while t < m["rise"] - 0.05:
        if rng.random() < 0.55:
            sfx.add(blip(penta[rng.integers(6)]), t, -26 - 6 * rng.random(), rng.uniform(-0.8, 0.8))
        t += 0.0625
    roll(m["rise"] - 0.5, m["rise"], -22, -12)
    lift_into(m["rise"], 0.5, -2)

    # ---- the wave: the city flares, light sweeps the silicon, columns of light, windows pixel by pixel
    R0, J0 = m["rise"], m["jump"]
    hit(R0, 0.9, True, 0)
    chords.add(stab(("A4", "D5", "F5", "C6")), R0, -13)
    sfx.add(approach(0.8, 0.5, 500), R0, -15)
    groove(R0, R0 + 1.0, "drive", 0)
    bassline(R0, J0 - 0.5, "roll", 0, 1.3)
    low(R0, J0 - 0.125, -12)
    pads(R0, J0, -17, 9000)
    hits = beam_hits()
    tones = [hz(x) for x in ("Bb3", "D4", "F4", "A4", "C5", "D5", "F5", "A5", "C6", "D6", "F6", "A6", "C7", "D7")]
    bins = {}
    for th, z0, x, _ in hits:
        bins.setdefault(int((th - R0) / 0.0625), []).append((z0, x))
    last = max(bins)
    for k, items in sorted(bins.items()):  # a column of light for every core the wave strikes, rising
        near = max(1 - z0 / 26000 for z0, _ in items)
        f = tones[min(len(tones) - 1, int(round(k / max(1, last) * (len(tones) - 1))))]
        pan = float(np.clip(np.mean([x for _, x in items]) / 2700, -0.8, 0.8))
        arps.add(pluck(f, 0.5, 1.4, 0.25), R0 + k * 0.0625, -24 + 9 * near + min(4, len(items)), pan)
    rng = np.random.default_rng(311)
    for th, z0, x, lifts in hits:  # each window lands pixel by pixel
        if not lifts:
            continue
        for _ in range(3):
            sfx.add(blip(penta[rng.integers(6)] * (0.5 if rng.random() < 0.3 else 1)), th + 0.2 + 0.35 * rng.random(), -31 + 8 * (1 - z0 / 12000), float(np.clip(x / 2700, -0.9, 0.9)))
    groove(R0 + 1.0, R0 + 1.5, "drive", 1)
    t = R0 + 1.5
    while t < J0 - 0.125 - 1e-6:  # the kick doubles, then doubles again
        kick_at(t, -7, 1.0)
        t += 0.25 if t < J0 - 0.5 else 0.125
    roll(R0 + 1.0, J0 - 0.125, -22, -7)
    sfx.add(hyperdrive(J0 - R0 - 0.8, 520), R0 + 0.8, -14)
    sfx.add(riser(J0 - R0 - 0.3, 300, 12000, (196, 1568), seed=521), R0 + 0.3, -18)
    lift_into(J0, 1.0, 2)

    # ---- the jump: a flash, and a tunnel of a thousand windows
    hit(J0, 1.6, True, 2)
    sfx.add(burst(1.6, 522, 9000, 0.35), J0, -15)
    groove(J0, m["back"], "full", 1.5)
    drums.add(crash(2.4, 303), J0 + 2, -16, -0.2)
    bassline(J0, m["back"], "off", 1)
    low(J0, m["back"], -10)
    pads(J0, m["back"], -14, 9500)
    arpeggio(J0, m["back"], -20, 1, 1.2)
    stabs(J0, m["back"], (3, 10, 14, 19, 26, 30), -18, 2)
    hook(J0, ["Dm", "Bb", "F", "C"], -8)
    sfx.add(sparkle(3.4, 9, 4500, 9500, seed=523, decay=0.2), J0 + 0.4, -31)
    for i in range(4):  # a fill out of the tunnel
        drums.add(tom(150 - 20 * i), m["back"] - 0.5 + 0.125 * i, -14 + i, 0.4 - 0.25 * i)

    # ---- back to the search; the stage: a rehearsal, bursts, lasers, the lights come up
    K0 = m["back"]
    sfx.end_at(reverse(whoosh(0.6, 5000, 500, 0.3, 0.8, seed=36)), K0 + 0.05, -18)
    sfx.add(thump(0.4, 110, 0.08), K0 + 0.6, -22)
    groove(K0, m["show"], "drive", -3.5, True)
    groove(m["show"], m["console"], "full", 0)
    bassline(K0, m["console"], "roll", -1)
    low(K0, m["console"], -13)
    arpeggio(K0, m["lasers"], -18, 0, 1.0)
    arpeggio(m["lasers"], m["console"], -19, 1, 1.15)
    pads(K0, m["show"], -25, 3400)
    pads(m["show"], m["console"], -16, 8000)
    stabs(m["show"], m["console"], (3, 6, 10, 19, 22, 26), -16)
    r0 = m["rehearse"]
    sfx.add(zap(0.5, 2400, 800, 37), r0 + 0.75, -19, 0.2)
    sfx.end_at(reverse(zap(0.5, 2400, 800, 38)), r0 + 1.75, -20, 0.1)
    for i, b0 in enumerate((m["burst"], m["burst"] + 0.35, m["burst"] + 0.7)):
        sfx.add(zap(0.3, 3000, 1100, 39 + i), b0, -18 - i, 0.25)
        sfx.add(glass(hz("A6") if i < 2 else hz("D7"), 0.7, 0.2, 42 + i), b0 + 0.3, -26, 0.35)
    sfx.add(whoosh(0.7, 400, 2200, 0.4, 0.7, seed=45), m["sheet"] + 0.7, -24)
    sfx.add(click(2200, 0.05, 46, 0.9), m["lasers"] - 0.4, -20, 0.4)
    sfx.add(click(3100, 0.04, 47, 0.4), m["lasers"] - 0.33, -26, 0.4)
    lane_pan = {"H": 0.0, "V1": -0.25, "V2": 0.1}
    for s in shots:
        d = min(0.22, s["dur"] * 0.2)
        f0, f1 = (3600, 1800) if s["lane"] == "H" else (2900, 1500)
        p = lane_pan[s["lane"]] + (0.3 if s["rev"] else -0.3) * (s["lane"] == "H")
        sfx.add(pew(d, f0, f1, int(s["t0"] * 100)), s["t0"], -26, p)
    lights = m["show"]
    lift_into(lights, 0.5, -3)
    hit(lights, 0.7, True, -2)
    sfx.add(norm(bandpass(noise(samples(0.5), 48), 300, 1600) * np.exp(-times(samples(0.5)) / 0.06)), lights - 0.25, -21)

    # ---- the console: aurora, glass, six dials, a touch
    C0 = m["console"]
    sfx.add(whoosh(1.1, 1800, 7000, 0.45, 0.7, seed=50), C0, -22)
    groove(C0, m["pillars"] - 1.0, "drive", -3)
    bassline(C0, m["pillars"] - 0.5, "roll", -1.5)
    low(C0, m["pillars"] - 0.5, -13)
    pads(C0, m["pillars"], -19, 5000)
    arpeggio(C0, m["pillars"] - 0.5, -18, 1, 1.0)
    knobs = [(50, 84), (50, 22), (50, 74), (50, 92), (50, 72), (50, 96)]
    for i, (a, b) in enumerate(knobs):
        t0 = m["knobs"] + 0.5 * i
        last_step = None
        for ms in range(0, 860, 2):
            v = a + (b - a) * float(ease_io(ms / 850))
            step = int(v // 2)
            if last_step is not None and step != last_step:
                sfx.add(click(4200, 0.02, ms + 10 * i, 0.3), t0 + ms / 1000, -33, pan=-0.45)
            last_step = step
        sfx.add(click(1900, 0.05, 60 + i, 0.8), t0, -25, pan=-0.45)
        span = abs(b - a) / 46  # the dial's sweep, heard as a filter opening or closing
        f_a, f_b = (900, 900 * 2 ** (2.6 * span)) if b > a else (900 * 2 ** (2.6 * span), 900)
        sfx.add(whoosh(0.85, f_a, f_b, 0.5, 0.35, seed=64 + i), t0, -27, -0.45)
    sfx.add(glass(hz("F6"), 1.4, 0.5, 61), m["knobs"] + 2.7, -24, 0.4)
    roll(m["pillars"] - 1.0, m["pillars"], -22, -9, kicks=True)
    lift_into(m["pillars"], 1.0)

    # ---- four places: four pillars, four chords; one line; one point; the name
    for k in range(4):
        t0 = m["pillars"] + 0.5 * k
        name = chord_at(t0)
        hit(t0, 0.6 + 0.15 * k, k == 0, -2)
        chords.add(supersaw(VOICE[name], 0.48, 7000.0, 0.003, 0.15, 7, 0.24, 20 + k), t0, -12)
        bass.add(bass_note(hz(BASS_ROOT[name]), 0.45, 1.2), t0, -6)
        drums.add(tom(90 + 18 * k), t0, -13)
    groove(m["pillars"] + 2.0, m["converge"], "half", 0)
    bassline(m["pillars"] + 2.0, m["converge"], "pulse", 0)
    pads(m["pillars"] + 2.0, m["converge"], -19, 4500)
    arpeggio(m["pillars"] + 2.0, m["point"], -22, 1, 1.0, ramp=lambda p: 6 * p)
    sfx.add(riser(m["point"] - m["converge"], 300, 9000, (247, 1976), seed=78), m["converge"], -16)
    roll(m["converge"], m["point"], -24, -12)
    lift_into(m["point"], 1.0, -2)
    sfx.add(zap(0.42, 1200, 6000, 79), m["point"], -21)
    sfx.add(glass(hz("D7"), 2.0, 0.7, 80), m["point"] + 0.42, -21)
    kick_at(m["point"], -6)
    groove(m["point"], m["lock"] - 1.0, "drive", -1)
    bassline(m["point"], m["lock"] - 0.125, "roll", 0, 1.2)
    low(m["point"], m["lock"] - 0.125, -12)
    pads(m["point"], m["lock"], -17, 6000)
    arpeggio(m["point"], m["lock"] - 0.125, -20, 1, 1.1, ramp=lambda p: 4 * p)
    t = m["lock"] - 1.0
    while t < m["lock"] - 0.125 - 1e-6:
        kick_at(t, -7, 1.0)
        t += 0.25 if t < m["lock"] - 0.5 else 0.125
    roll(m["lock"] - 1.5, m["lock"] - 0.125, -22, -7)
    sfx.add(riser(m["lock"] - m["point"], 260, 12000, (196, 1568), seed=88), m["point"], -16)
    lift_into(m["lock"], 1.0, 2)

    # ---- the name: 灵感台
    Z0 = m["lock"]
    hit(Z0, 1.7, True, 2)
    sfx.add(burst(1.4, 89, 9000, 0.3), Z0, -15)
    groove(Z0, m["dark"], "full", 1.5)
    drums.add(crash(2.4, 304), Z0 + 2, -16, -0.2)
    bassline(Z0, m["dark"], "off", 1)
    low(Z0, m["dark"], -10)
    pads(Z0, m["dark"], -14, 9500)
    arpeggio(Z0, m["dark"], -20, 1, 1.2)
    hook(Z0, ["F", "C", "Dm", "Bb"], -8, until=m["dark"])
    gather = sparkle(1.5, 46, 2500, 9000, seed=101, decay=0.12, density=lambda p: 0.2 + 1.6 * p ** 1.5)
    sfx.add(gather * swell(gather.shape[1], 0.3, 0.2, 1), Z0 + 0.15, -30)

    # ---- one more thing: the machine winds down; silence, and a held breath
    sfx.add(power_down(("D2", "A2", "D3", "F3"), 0.62), m["dark"] - 0.08, -12)
    sfx.add(lowpass(norm(noise(samples(0.7), 112)), 600) * swell(samples(0.7), 0.1, 0.5, 1), m["dark"] - 0.1, -26)
    lift_into(m["cut"], 0.6, -8)

    # ---- the residents: two panes of glass, then forty-nine; F major, a bounce in its step
    U0 = m["cut"]
    for b0 in (U0, U0 + 1.0):
        kick_at(b0, -11, 0.8)
    drums.add(clap(27, 0.05), U0 + 0.5, -18, 0.1)
    drums.add(clap(28, 0.05), U0 + 1.5, -18, 0.1)
    sfx.add(scratch(0.8, 111), m["pen"], -22, -0.2)
    sfx.add(mallet(hz("F6"), 1.2, 0.5), m["lueurs"], -15, -0.25)
    sfx.add(mallet(hz("C6"), 1.2, 0.5), m["lueurs"] + 0.25, -16, -0.1)
    low(U0, U0 + 2.0, -18)
    S1 = m["swarm"]
    groove(S1, GARDEN, "bounce", 0)
    bassline(S1, GARDEN, "bounce", -1)
    low(S1, GARDEN, -15)
    pads(S1, GARDEN, -22, 3600)
    swarm = sparkle(2.6, 26, 2400, 8000, seed=114, decay=0.12, density=lambda p: np.sin(np.pi * min(1, p * 1.1)) + 0.05)
    sfx.add(swarm, S1, -28)
    sfx.add(whoosh(2.6, 400, 3000, 0.4, 0.9, seed=115), S1, -28)
    tune = [(0, "A5", .5), (.5, "C6", .5), (1, "F6", 1), (2, "E6", .5), (2.5, "C6", .5), (3, "A5", .5), (3.5, "C6", .5),
            (4, "D6", .5), (4.5, "F6", .5), (5, "A6", 1), (6, "G6", .5), (6.5, "F6", .5), (7, "D6", 1),
            (8, "F6", .5), (8.5, "D6", .5), (9, "Bb5", 1), (10, "C6", .5), (10.5, "D6", .5), (11, "F6", 1),
            (12, "E6", .5), (12.5, "G6", .5), (13, "C7", 1), (14, "Bb6", .5), (14.5, "G6", .5), (15, "E6", .5), (15.5, "C6", .5),
            (16, "F6", .5), (16.5, "A6", .5), (17, "C7", 1), (18, "A6", .5), (18.5, "F6", .5), (19, "C6", 1),
            (20, "E6", .5), (20.5, "G6", .5), (21, "E6", .5), (21.5, "C6", .5), (22, "D6", 1), (23, "E6", 1)]
    for beat, note, length in tune:
        music_note = mallet(hz(note), 0.9, round(0.22 + 0.2 * length, 3))
        arps.add(music_note, S1 + beat * BEAT, -14, 0.12)
        arps.add(pluck(hz(note) / 2, 0.25, 0.8, 0.12), S1 + beat * BEAT, -24, -0.12)
    hitm = m["meet"] + 0.9
    sfx.add(glass(3300.0, 1.2, 0.35, 130), hitm, -18, 0.05)
    sfx.add(click(3300, 0.04, 131, 0.5), hitm, -22, 0.05)
    for i, note in enumerate(["D6", "F6", "G6", "A6", "C7", "D7", "F7", "G7", "A7"]):  # a constellation
        arps.add(pluck(hz(note) / 2, 0.45, 1.3, 0.22), m["stars"] + 0.11 * i, -19, -0.6 + 0.15 * i)
    sfx.add(thump(0.3, 220, 0.05), m["hold"], -24)
    loop = m["loop"]
    n = samples(1.6)
    tt = times(n)
    swirl = norm(shape(noise(n, 170), band(lambda t: 900 + 1600 * np.sin(np.pi * np.clip(t / 1.6, 0, 1)), 0.7))) * swell(n, 0.5, 0.6, 1.2)
    sfx.add(pan2(swirl, 0.7 * np.sin(TAU * tt / 1.6)), loop, -25)
    flick = loop + 1.5
    sfx.add(click(3600, 0.04, 172, 0.3), flick - 0.05, -24, 0.3)
    sfx.add(whoosh(0.45, 1500, 5000, 0.3, 0.6, seed=173), flick - 0.05, -22, 0.35)
    for i, note in enumerate(["C6", "F6", "A6", "C7", "F7"]):
        arps.add(pluck(hz(note) / 2, 0.4, 1.3, 0.2), flick + 0.15 + 0.125 * i, -20 - 0.5 * i, 0.4 - 0.18 * i)

    # ---- the back garden: warm, the step slows, fireflies; then the last build
    groove(GARDEN, GARDEN + 3.0, "soft", 0)
    bassline(GARDEN, GARDEN + 3.0, "pulse", -4, 0.6)
    low(GARDEN, m["device"], -15)
    pads(GARDEN, m["device"], -18, 2400)
    for beat, note, length in ((0, "F6", 1.5), (1.5, "D6", .5), (2, "C6", 1), (3, "A5", 1), (4, "C6", 1), (5, "A5", 1)):
        arps.add(mallet(hz(note), 1.4, round(0.3 + 0.25 * length, 3)), GARDEN + beat * BEAT, -15, 0.1)
    sfx.add(sparkle(m["device"] - m["garden"] - 0.6, 3.0, 3500, 7500, seed=181, decay=0.4), m["garden"] + 0.6, -32)
    roll(m["device"] - 1.0, m["device"], -26, -9, kicks=True)
    sfx.add(riser(1.2, 300, 9000, (196, 1568), seed=189), m["device"] - 1.2, -17)
    lift_into(m["device"], 1.0)

    # ---- made for one screen: the device, its numbers slammed down one by one, the hook
    D0 = m["device"]
    hit(D0, 1.2, True, 0)
    sfx.add(whoosh(1.5, 220, 1600, 0.6, 0.9, seed=190), D0 + 0.1, -21, 0.2)
    groove(D0, m["tag"], "full", 0)
    bassline(D0, m["tag"], "roll", 0, 1.2)
    low(D0, m["tag"], -11)
    pads(D0, m["tag"], -16, 8500)
    arpeggio(D0, m["tag"], -21, 1, 1.15)
    hook(D0 + 4, ["F", "C", "Dm", "Bb"], -8)
    for i in range(4):
        t0 = m["specs"] + 0.5 * i
        big.add(boom(1.6, 40, 120, 0.45), t0, -12)
        drums.add(tom(140 - 14 * i, 0.5), t0, -11, 0.3)
        chords.add(stab(tuple(n_[:-1] + str(int(n_[-1]) + 1) for n_ in VOICE[chord_at(t0)][1:4])), t0, -13)
        sfx.add(norm(highpass(noise(samples(0.4), 196 + i), 3000) * np.exp(-times(samples(0.4)) / 0.06)), t0, -24, 0.35)
    for i, steps in ((0, 14), (2, 12), (3, 12)):
        t0 = m["specs"] + 0.5 * i
        prev = 0
        for ms in range(0, 900, 3):
            step = int(float(ease_out(ms / 900)) * steps + 1e-9)
            if step != prev:
                sfx.add(click(5200, 0.015, ms + i, 0.2), t0 + ms / 1000, -33, 0.4)
            prev = step

    # ---- launch from here: the music closes, climbs and opens on D major; the ring closes; the light stays
    T0_, F2 = m["tag"], m["flash2"]
    groove(T0_, F2 - 1.0, "drive", 0)
    t = F2 - 1.0
    while t < F2 - 0.125 - 1e-6:
        kick_at(t, -6, 1.0)
        t += 0.25 if t < F2 - 0.5 else 0.125
    bassline(T0_, F2 - 0.125, "roll", 0, 1.3)
    low(T0_, F2 - 0.125, -11)
    pads(T0_, F2, -16, 9000)
    arpeggio(T0_, F2 - 0.125, -20, 1, 1.2, ramp=lambda p: 3 * p)
    roll(T0_, F2 - 0.125, -24, -6)
    sfx.add(riser(F2 - T0_ - 0.4, 300, 12000, (247, 1976), seed=201), T0_ + 0.4, -15)
    n = samples(F2 - (T0_ + 0.95))
    tt = times(n)
    line = np.sin(TAU * np.cumsum(hz("A4") * 2 ** (tt / (n / SR))) / SR) * (tt / (n / SR)) ** 1.5
    sfx.add(norm(line), T0_ + 0.95, -27)
    lift_into(F2, 1.0, 2)

    hit(F2, 1.8, True, 2)
    sfx.add(burst(2.0, 202, 9000, 0.4), F2, -14)
    groove(F2, F2 + 4.0, "full", 1.5)
    drums.add(crash(2.4, 305), F2 + 2, -16, -0.2)
    bassline(F2, F2 + 4.0, "off", 1)
    low(F2, F2 + 4.0, -10)
    pads(F2, F2 + 4.0, -14, 9500)
    arpeggio(F2, F2 + 4.0, -20, 1, 1.2)
    stabs(F2, F2 + 4.0, (3, 10, 14, 19, 26, 30), -18, 2)
    hook(F2, ["D", "A", "Bm", "G"], -8)
    ring = F2 + 3.0
    sfx.add(click(2900, 0.05, 228), ring, -22)
    sfx.add(glass(hz("A6"), 2.0, 0.8, 229), ring, -21, 0.1)
    end = F2 + 4.0
    hit(end, 1.4, True, 0)
    chords.add(supersaw(VOICE["D"] + ("D5", "F#5", "A5"), round(DUR - end + 0.5, 3), 7000.0, 0.004, 1.8, 7, 0.24, 33), end, -13)
    for i, note in enumerate(("A4", "D5", "F#5")):
        lead.add(lead_note(hz(note), round(DUR - end - 0.6, 3)), end, -14 - 2 * i, -0.2 + 0.2 * i)
    bass.add(bass_note(hz("D2"), round(DUR - end - 0.5, 3), 0.8), end, -8)
    sub.add(np.sin(TAU * hz("D2") * times(samples(DUR - end))) * swell(samples(DUR - end), 0.01, 1.8, 1), end, -10)
    for i, note in enumerate(["D6", "F#6", "A6", "D7"]):
        arps.add(pluck(hz(note), 1.2, 1.2, 0.6), end + 0.25 * i, -21 - i, -0.3 + 0.2 * i)


# ---------------------------------------------------------------- master
def reverb_ir(rt60, length, pre, bright, dark, seed):
    n = samples(length)
    t = times(n)
    rng = np.random.default_rng(seed)
    x = rng.standard_normal((2, n))
    b = lowpass(x, bright)
    d = lowpass(x, dark)
    w = 1 - np.exp(-t / 0.3)
    ir = (b * (1 - w) + 1.5 * d * w) * 10 ** (-3 * t / rt60) * edges(n, 0.004, 0.2)
    for ms, g in ((7, 0.5), (13, -0.38), (19, 0.31), (29, -0.24), (37, 0.2), (53, 0.14)):
        k = samples(ms / 1000)
        ir[0, k] += g * 3
        ir[1, k + samples(0.0017)] += g * 3
    ir = np.concatenate([np.zeros((2, samples(pre))), ir], axis=1)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def convolve(x, ir):
    return np.vstack([signal.fftconvolve(x[c], ir[c])[: x.shape[1]] for c in range(2)])


def duck(depth, release=0.15):
    """Sidechain: the gain of everything that breathes with the kick."""
    g = np.ones(LENGTH)
    for t, weight in KICKS:
        i = int(round(t * SR))
        if i >= LENGTH:
            continue
        n = min(LENGTH - i, samples(release * 5))
        tt = times(n)
        d = depth * weight * np.clip(tt / 0.004, 0, 1) * np.exp(-np.maximum(0, tt - 0.004) / release)
        g[i:i + n] = np.minimum(g[i:i + n], 1 - d)
    return g


def echoes(x, delay=0.375, feedback=0.4, taps=4, cutoff=5000):
    """Dotted-eighth echoes, left and right in turn, each darker than the last."""
    out = np.zeros_like(x)
    y = x.mean(0)
    d = samples(delay)
    for k in range(1, taps + 1):
        y = lowpass(y, cutoff) * feedback
        if k * d >= x.shape[1]:
            break
        out[k % 2, k * d:] += y[: x.shape[1] - k * d]
    return out


K_PRE = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
K_RLB = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def loudness(x):
    """Integrated loudness (ITU-R BS.1770-4), LUFS, and the 400 ms block loudness over time."""
    y = signal.lfilter(*K_PRE, x, axis=-1)
    y = signal.lfilter(*K_RLB, y, axis=-1)
    block, hop = samples(0.4), samples(0.1)
    power = np.cumsum(np.concatenate([np.zeros((2, 1)), y ** 2], axis=1), axis=1)
    starts = np.arange(0, y.shape[1] - block, hop)
    z = (power[:, starts + block] - power[:, starts]) / block
    lk = -0.691 + 10 * np.log10(np.maximum(z.sum(0), 1e-12))
    gated = z[:, lk > -70]
    rel = -0.691 + 10 * np.log10(gated.sum(0).mean()) - 10
    keep = z[:, (lk > -70) & (lk > rel)]
    return -0.691 + 10 * np.log10(keep.sum(0).mean()), starts / SR, lk


def true_peak(x):
    up = signal.resample_poly(x, 4, 1, axis=-1)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def limit(x, ceiling_db=-1.5, lookahead=0.005, release=0.12):
    ceiling = db(ceiling_db)
    blk = 32
    n = x.shape[1] // blk * blk
    peaks = np.abs(x[:, :n]).max(0).reshape(-1, blk).max(1)
    want = np.minimum(1, ceiling / np.maximum(peaks, 1e-9))
    ahead = int(np.ceil(lookahead * SR / blk)) + 1
    want = minimum_filter1d(want, size=2 * ahead + 1, origin=0)
    g = np.empty_like(want)
    a = np.exp(-blk / (release * SR))
    cur = 1.0
    for i, w in enumerate(want):
        cur = w if w < cur else w + (cur - w) * a
        g[i] = cur
    gain = np.interp(np.arange(x.shape[1]), np.arange(len(g)) * blk + blk / 2, g)
    return np.clip(x * gain, -ceiling, ceiling)


def master(target=-14.5):
    m = M
    cut = lambda bus: bus.x[:, :LENGTH]  # noqa: E731
    dr, bs, sb, ch, ar, ld, fx, bg = (cut(b) for b in (drums, bass, sub, chords, arps, lead, sfx, big))
    bg = highpass(bg, 36, 2)
    # everything tonal breathes with the kick: the chords most, the sub nearly as much, the rest a little
    ch = ch * duck(0.62)
    sb = 0.6 * sb * duck(0.55, 0.12)
    bs = bs * duck(0.25, 0.08)
    ar = 1.25 * ar * duck(0.22, 0.1)
    ar = ar + 0.5 * echoes(ar, 0.375, 0.42, 4, 4200)
    ld = ld + 0.38 * echoes(ld, 0.375, 0.36, 3, 5200)

    # the music opens and closes with the scenes; drums and sound effects stay as they are
    def cutoff(t):
        c = np.full_like(t, 20000.0)
        for a, b, lo, hi in (
                (0.0, m["draw0"], 320, 320), (m["draw0"], m["press1"] - 0.1, 320, 9000), (m["press1"] - 0.1, m["press1"], 9000, 20000),
                (m["press1"], m["press2"] - 1.0, 2200, 2200), (m["press2"] - 1.0, m["press2"], 2200, 20000),
                (m["warp"], m["slit"], 20000, 480), (m["slit"], m["open"], 480, 480), (m["open"], m["open"] + 0.5, 480, 20000),
                (m["dark"] - 0.3, m["dark"], 20000, 400),
                (m["cut"], m["swarm"] - 0.25, 1500, 1500), (m["swarm"] - 0.25, m["swarm"], 1500, 20000),
                (GARDEN, m["device"] - 1.0, 2400, 2400), (m["device"] - 1.0, m["device"], 2400, 20000),
                (m["tag"], m["flash2"], 650, 20000)):
            sel = (t >= a) & (t < b)
            c[sel] = lo * (hi / lo) ** ((t[sel] - a) / max(b - a, 1e-6))
        return c
    tonal = shape(ch + ar + ld, lowpass_moving(cutoff, 2))
    low_ = shape(bs + sb, lowpass_moving(cutoff, 2))
    # silence where the film holds its breath
    t = times(LENGTH)
    hush = np.ones(LENGTH)
    hush[(t > m["dark"]) & (t < m["cut"] - 0.02)] = 0.0
    edge = (t >= m["dark"] - 0.3) & (t <= m["dark"])
    hush[edge] = np.cos((t[edge] - (m["dark"] - 0.3)) / 0.3 * np.pi / 2) ** 2
    tonal, low_, dr, bg = tonal * hush, low_ * hush, dr * hush, bg * hush
    hall = reverb_ir(2.4, 3.5, 0.02, 8000, 2600, 1)
    room = reverb_ir(0.9, 1.6, 0.008, 9000, 4000, 2)
    wet = convolve(tonal, hall) * 0.2 + convolve(dr, room) * 0.06 + convolve(fx, room) * 0.14 + convolve(bg, hall) * 0.16
    late = np.ones(LENGTH)
    late[(t > m["dark"] + 0.35) & (t < m["cut"] - 0.02)] = 0.0
    edge = (t >= m["dark"]) & (t <= m["dark"] + 0.35)
    late[edge] = np.cos((t[edge] - m["dark"]) / 0.35 * np.pi / 2) ** 2
    mix = tonal + low_ + dr + fx + bg + wet * late
    mix = highpass(mix, 36, 2)
    mix = signal.lfilter(*shelf(4000, 3.5), mix, axis=-1)
    # a faint room tone in the held breath, so the silence is a place, not a dropout
    tone = lowpass(np.vstack([noise(LENGTH, 300), noise(LENGTH, 301)]), 600) * db(-62)
    mix += tone * ((t > m["dark"]) & (t < m["cut"]))
    mix *= edges(LENGTH, 0.01, 1.8)
    ceiling = -1.5
    for _ in range(4):
        for _ in range(3):
            lufs, _, _ = loudness(mix)
            mix = limit(mix * db(target - lufs), ceiling)
        peak = true_peak(mix)
        if peak <= -1.0:
            break
        ceiling -= peak + 1.05
    lufs, starts, lk = loudness(mix)
    return mix, lufs, true_peak(mix), starts, lk


def report(mix, starts, lk, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(22, 9), sharex=True, gridspec_kw={"height_ratios": [2, 1]})
    mono = mix.mean(0)
    f, tt, s = signal.spectrogram(mono, SR, nperseg=4096, noverlap=3072)
    a1.pcolormesh(tt, f, 10 * np.log10(s + 1e-14), shading="auto", cmap="magma", vmin=-130, vmax=-40)
    a1.set_yscale("symlog", linthresh=200)
    a1.set_ylim(30, 20000)
    a2.plot(starts + 0.2, lk, lw=0.8)
    a2.set_ylim(-60, -5)
    for name, t in M.items():
        for ax in (a1, a2):
            ax.axvline(t, color="cyan", lw=0.4, alpha=0.6)
        a2.text(t, -8, name, rotation=90, fontsize=7, va="top")
    a2.set_xlim(0, DUR)
    fig.tight_layout()
    fig.savefig(path, dpi=80)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(FILM / "score.m4a"))
    parser.add_argument("--wav")
    parser.add_argument("--report")
    args = parser.parse_args()
    compose()
    mix, lufs, peak, starts, lk = master()
    print(f"{DUR:.2f} s, {lufs:.1f} LUFS integrated, true peak {peak:.1f} dBTP")
    pcm = (mix.T * 32767 + np.random.default_rng(0).triangular(-1, 0, 1, mix.T.shape)).clip(-32768, 32767).astype(np.int16)
    with tempfile.TemporaryDirectory() as tmp:
        wav = args.wav or str(pathlib.Path(tmp) / "score.wav")
        wavfile.write(wav, SR, pcm)
        out = pathlib.Path(args.out)
        webm = out.with_suffix(".webm")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "libopus", "-b:a", "144k", str(webm)], check=True)
    for path in (out, webm):
        try:
            shown = path.resolve().relative_to(ROOT)
        except ValueError:
            shown = path
        print(f"wrote {shown} ({path.stat().st_size // 1024} KB)")
    if args.report:
        report(mix, starts, lk, args.report)


if __name__ == "__main__":
    sys.exit(main())
