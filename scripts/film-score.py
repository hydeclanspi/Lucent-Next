"""Compose the concept film's score from its timeline.

    python3 scripts/film-score.py                                  # demo/film/score.m4a and score.webm
    python3 scripts/film-score.py --wav score.wav --report score.png

The score reads the scene marks in demo/film/film.js, so picture and sound keep one clock: the marks
sit on a grid of 120 beats a minute, and so do the chords. The lasers on the stage are scheduled by
the same seeded generator as in the film, so every shot is heard where it is seen.

Everything is synthesized here with numpy and scipy, with no samples: pads of detuned saws, plucked
strings, bells, a celesta, a music box, a choir of formants, drums, risers, whooshes and clicks.
Two reverbs, a limiter, loudness about -16 LUFS with true peaks under -1 dBTP. ffmpeg writes AAC
(score.m4a, also laid under the rendered video) and Opus (score.webm, for browsers without AAC).
"""
import argparse
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


# ---------------------------------------------------------------- the film's clock
def read_marks():
    text = (FILM / "film.js").read_text("utf-8")
    body = re.search(r"var M = \{(.*?)\};", text, re.S).group(1)
    return {k: float(v) for k, v in re.findall(r"(\w+):\s*([\d.]+)", body)}


M = read_marks()
DUR = M["end"]
LENGTH = int(round(DUR * SR))


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


# ---------------------------------------------------------------- instruments
def partials(f, dur, table, decay, phase_seed=0, attack=0.0015):
    """Sum of sine partials (ratio, amplitude, relative decay)."""
    n = samples(dur)
    t = times(n)
    rng = np.random.default_rng(phase_seed)
    y = np.zeros(n)
    for ratio, amp, d in table:
        if f * ratio > SR * 0.45:
            continue
        y += amp * np.sin(TAU * f * ratio * t + rng.random() * TAU) * np.exp(-t / (decay * d))
    return norm(y * edges(n, attack, 0.03))


def pluck(f, dur=2.4, decay=0.9, bright=0.72, seed=0):
    """A plucked string, additive: higher harmonics fade sooner."""
    n = samples(dur)
    t = times(n)
    y = np.zeros(n)
    count = int(max(1, min(26, 10000 / f)))
    for k in range(1, count + 1):
        y += (bright ** (k - 1) / k ** 0.7) * np.sin(TAU * f * k * (1 + 0.00035 * k * k) * t + 0.3 * k) * np.exp(-t / (decay / (1 + 0.55 * (k - 1))))
    return norm(y * edges(n, 0.0015, 0.04))


BELL = ((1, 1, 1), (2.0, 0.55, 0.62), (2.76, 0.42, 0.46), (4.07, 0.24, 0.3), (5.4, 0.16, 0.22), (8.93, 0.07, 0.12))
CELESTA = ((1, 1, 1), (2.0, 0.28, 0.45), (3.0, 0.12, 0.3), (4.01, 0.06, 0.2))
MUSICBOX = ((1, 1, 1), (2.0, 0.08, 0.5), (5.95, 0.18, 0.18), (11.3, 0.05, 0.08))
GLASS = ((1, 1, 1), (2.32, 0.62, 0.55), (4.25, 0.36, 0.32), (6.63, 0.2, 0.2), (9.38, 0.08, 0.12))


def bell(note, dur=3.5, decay=1.5, seed=0):
    return partials(hz(note), dur, BELL, decay, seed)


def celesta(note, dur=2.0, decay=0.9, seed=0):
    y = partials(hz(note), dur, CELESTA, decay, seed, 0.001)
    click = highpass(noise(samples(0.006), seed + 9), 3000) * np.hanning(samples(0.006))
    y[: len(click)] += 0.15 * click
    return norm(y)


def musicbox(note, dur=2.4, decay=1.1, seed=0):
    y = partials(hz(note), dur, MUSICBOX, decay, seed, 0.0008)
    click = highpass(noise(samples(0.004), seed + 3), 5000) * np.hanning(samples(0.004))
    y[: len(click)] += 0.25 * click
    return norm(y)


def glass(f=2600, dur=1.4, decay=0.32, seed=0):
    return partials(f, dur, GLASS, decay, seed, 0.0006)


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


def pad(notes, dur, cutoff=1600, attack=0.9, release=1.4, detune=0.11, voices=3, seed=1, width=0.7):
    n = samples(dur)
    t = times(n)
    rng = np.random.default_rng(seed)
    out = np.zeros((2, n))
    for note in notes:
        f0 = hz(note)
        for v, d in enumerate(np.linspace(-detune, detune, voices)):
            drift = 1 + 0.0012 * np.sin(TAU * (0.11 + 0.13 * rng.random()) * t + rng.random() * TAU)
            s = saw(f0 * 2 ** (d / 12) * drift, n, rng.random())
            out += pan2(s, width * (v / max(1, voices - 1) * 2 - 1))
    out = lowpass(out, cutoff, 2)
    return norm(out) * swell(n, attack, release, 1.6)


FORMANTS = ((730, 1.0, 9.0), (1090, 0.5, 11.0), (2440, 0.28, 16.0), (3400, 0.1, 18.0))


def choir(notes, dur, attack=1.1, release=1.8, seed=5):
    """Voices on 'ah': saws through the formants of the vowel, with vibrato and breath."""
    n = samples(dur)
    t = times(n)
    rng = np.random.default_rng(seed)
    src = np.zeros((2, n))
    for note in notes:
        f0 = hz(note)
        for v in range(4):
            vib = 1 + 0.0045 * np.sin(TAU * (4.8 + 0.6 * rng.random()) * t + rng.random() * TAU) * np.clip(t / 0.8, 0, 1)
            s = saw(f0 * 2 ** ((v - 1.5) * 0.06 / 12) * vib, n, rng.random())
            src += pan2(s, (v / 3) * 1.4 - 0.7)
    src += 0.06 * np.vstack([noise(n, seed + 1), noise(n, seed + 2)])
    out = np.zeros((2, n))
    for freq, gain, q in FORMANTS:
        b, a = signal.iirpeak(freq, q, fs=SR)
        out += gain * signal.lfilter(b, a, src, axis=-1)
    return norm(out) * swell(n, attack, release, 1.8)


def kick(gain=1.0, punch=1.0, dur=0.55):
    n = samples(dur)
    t = times(n)
    f = 52 + 125 * punch * np.exp(-t / 0.042)
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.3)
    y = np.tanh(1.8 * y)
    click = highpass(noise(n, 11), 1800) * np.exp(-t / 0.0025)
    return gain * norm(y + 0.35 * click) * edges(n, 0.0005, 0.05)


def snap(seed=21):
    n = samples(0.35)
    t = times(n)
    env = np.zeros(n)
    for k, off in enumerate((0, 0.009, 0.019)):
        tt = np.clip(t - off, 0, None)
        env += (t >= off) * np.exp(-tt / 0.008) * (1 - 0.25 * k)
    env += 0.5 * np.exp(-t / 0.09)
    return norm(bandpass(noise(n, seed), 900, 5200) * env)


def hat(open_=False, seed=31):
    n = samples(0.45 if open_ else 0.09)
    t = times(n)
    return norm(highpass(noise(n, seed), 7200, 4) * np.exp(-t / (0.11 if open_ else 0.022)))


def shaker(seed=41):
    n = samples(0.12)
    t = times(n)
    env = np.sin(np.pi * np.clip(t / 0.1, 0, 1)) ** 2
    return norm(bandpass(noise(n, seed), 4500, 11000) * env)


def boom(dur=3.2, low=33, high=72, tau=1.3):
    n = samples(dur)
    t = times(n)
    f = low + (high - low) * np.exp(-t / 0.22)
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / tau)
    return norm(np.tanh(1.5 * y)) * edges(n, 0.002, 0.2)


def thump(dur=0.5, freq=78, tau=0.12):
    n = samples(dur)
    t = times(n)
    f = freq * (1 + 0.8 * np.exp(-t / 0.02))
    return norm(np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / tau)) * edges(n, 0.0008, 0.05)


def click(freq=2600, dur=0.05, seed=51, body=0.4):
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


def riser(dur, f0=260, f1=6500, tone=(196, 1568), seed=81):
    n = samples(dur)
    t = times(n)
    p = t / dur
    x = shape(noise(n, seed), band(lambda tt: f0 * (f1 / f0) ** np.clip(tt / dur, 0, 1) ** 1.6, 0.9))
    g = tone[0] * (tone[1] / tone[0]) ** (p ** 1.5)
    y = norm(x) + 0.35 * np.sin(TAU * np.cumsum(g) / SR)
    return norm(y * p ** 2.4) * edges(n, 0.01, 0.006)


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


def sparkle(dur, rate, f_lo, f_hi, seed=111, decay=0.18, density=None):
    """A cloud of tiny glass pings."""
    n = samples(dur)
    out = np.zeros((2, n))
    rng = np.random.default_rng(seed)
    t = 0.0
    while t < dur:
        d = density(t / dur) if density else 1.0
        t += rng.exponential(1 / max(rate * d, 1e-3))
        if t >= dur:
            break
        f = f_lo * (f_hi / f_lo) ** rng.random()
        ping = glass(f, 0.5, decay * (0.6 + 0.8 * rng.random()), int(rng.integers(1 << 30)))
        i = samples(t)
        j = min(n, i + len(ping))
        out[:, i:j] += pan2(ping[: j - i] * (0.35 + 0.65 * rng.random()), rng.uniform(-0.85, 0.85))
    return out


def reverse(x):
    return x[..., ::-1].copy()


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
        n = sig.shape[-1]
        self.add(sig, t - n / SR, gain_db, pan)


music, sfx, big = Bus(), Bus(), Bus()


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


# ---------------------------------------------------------------- harmony
VOICINGS = {
    "E": ["E3", "B3", "F#4", "G#4", "B4"],
    "Emaj9": ["E3", "B3", "D#4", "F#4", "G#4"],
    "C#m": ["C#3", "G#3", "B3", "E4", "G#4"],
    "C#m9": ["C#3", "G#3", "B3", "D#4", "E4"],
    "A": ["A2", "E3", "G#3", "B3", "C#4"],
    "B": ["B2", "F#3", "A3", "D#4", "F#4"],
    "Bsus": ["B2", "F#3", "A3", "C#4", "E4"],
    "drone": ["E3", "B3"],
}
ROOTS = {"E": "E1", "Emaj9": "E1", "C#m": "C#2", "C#m9": "C#2", "A": "A1", "B": "B1", "Bsus": "B1", "drone": "E1"}
ARPS = {
    "E": ["E4", "B4", "G#4", "B4", "F#5", "B4", "G#4", "B4"],
    "Emaj9": ["E4", "B4", "D#5", "B4", "F#5", "B4", "G#4", "B4"],
    "C#m": ["C#4", "G#4", "E4", "G#4", "B4", "G#4", "E4", "G#4"],
    "C#m9": ["C#4", "G#4", "D#5", "G#4", "E5", "G#4", "B4", "G#4"],
    "A": ["A3", "E4", "C#4", "E4", "B4", "E4", "C#4", "E4"],
    "B": ["B3", "F#4", "D#4", "F#4", "A4", "F#4", "D#4", "F#4"],
    "Bsus": ["B3", "F#4", "E4", "F#4", "A4", "F#4", "E4", "F#4"],
}
GOLD_ARPS = {
    "E": ["E5", "B5", "F#6", "G#6", "B6", "G#6", "F#6", "B5"],
    "C#m9": ["C#5", "G#5", "D#6", "E6", "G#6", "E6", "D#6", "G#5"],
    "A": ["A4", "E5", "B5", "C#6", "G#6", "C#6", "B5", "E5"],
}


def chords():
    """The chord under every moment, on the bar lines of the grid."""
    loop = ["E", "C#m", "A", "B"]
    seq = [(0.0, "drone"), (M["press1"], "Emaj9"), (M["press2"], "A"), (M["morph"], "Bsus"),
           (M["flash"], "E"), (M["flash"] + 2, "C#m9")]
    seq += [(M["bench"] + 2 * i, loop[i % 4]) for i in range(5)]
    seq += [(M["warp"], "Bsus"), (M["open"] + 0.5, "Emaj9"), (M["open"] + 2.5, "C#m9"), (M["open"] + 4.5, "A")]
    seq += [(M["back"] + 1.5 + 2 * i, loop[i % 4]) for i in range(7)]
    seq += [(M["pillars"] - 0.5, "B"), (M["pillars"], "E"), (M["converge"], "Bsus"), (M["point"] + 0.5, "drone"),
            (M["lock"], "E"), (M["lock"] + 2, "A"), (M["dark"], None)]
    seq += [(M["cut"], "E")] + [(M["cut"] + 1 + 2 * i, loop[i % 4]) for i in range(7)]
    seq += [(M["garden"], "Emaj9"), (M["garden"] + 2, "A"), (M["garden"] + 3.25, "E"),
            (M["device"], "B")] + [(M["device"] + 1 + 2 * i, loop[i % 4]) for i in range(4)]
    seq += [(M["tag"], "Bsus"), (M["flash2"], "Emaj9"), (M["flash2"] + 2, "A"), (M["flash2"] + 4, "Emaj9"), (DUR, None)]
    return sorted(seq)


CHORDS = chords()


def chord_at(t):
    name = None
    for start, c in CHORDS:
        if start <= t + 1e-9:
            name = c
    return name


# ---------------------------------------------------------------- composing
def compose():
    shots = laser_shots()

    # ---- pads, bass and air under everything
    pad_level = [  # (from, to, dB): how present the pad is, scene by scene
        (0, M["press1"], -33), (M["press1"], M["flash"], -23), (M["flash"], M["bench"], -20),
        (M["bench"], M["warp"], -25), (M["warp"], M["open"], -35), (M["open"], M["back"], -21),
        (M["back"], M["console"], -26), (M["console"], M["pillars"], -23), (M["pillars"], M["point"], -24),
        (M["point"], M["lock"], -31), (M["lock"], M["dark"], -19), (M["cut"], M["garden"], -27), (M["garden"], M["device"], -24),
        (M["device"], M["tag"], -24), (M["tag"], M["flash2"], -26), (M["flash2"], DUR, -19)]

    def level_at(t):
        for a, b, g in pad_level:
            if a <= t < b:
                return g
        return -40

    for k, (start, name) in enumerate(CHORDS[:-1]):
        end = CHORDS[k + 1][0]
        if name is None or end <= start:
            continue
        dur = end - start + 1.6
        bright = 3600 if start >= M["flash"] and not (M["cut"] <= start < M["garden"]) else 2200
        if M["open"] <= start < M["back"] or M["flash2"] <= start:
            bright = 5200
        p = pad(VOICINGS[name], dur, cutoff=bright, attack=0.5 if start not in (M["press1"], M["open"] + 0.5) else 0.9,
                release=1.6, seed=k + 3)
        music.add(p, start, level_at(start + 0.01))
        if name != "drone" and M["bench"] <= start < M["dark"] or M["device"] <= start < M["tag"]:
            n = samples(dur)
            tt = times(n)
            f = hz(ROOTS[name])
            bass = (np.sin(TAU * f * tt) + 0.55 * np.sin(TAU * 2 * f * tt) + 0.12 * np.sin(TAU * 3 * f * tt)) * swell(n, 0.06, 1.5, 1)
            music.add(np.tanh(1.2 * bass), start, -31)
    drone = pad(["E2", "B2"], M["press1"] + 1.5, cutoff=700, attack=1.6, release=1.5, seed=99)
    music.add(drone, 0.0, -31)

    # ---- the choir, where the light opens
    music.add(choir(["E4", "G#4", "B4", "F#5"], 3.0, 0.4, 2.2, seed=6), M["press2"], -27)
    music.add(choir(["B3", "E4", "G#4", "B4", "D#5"], 4.5, 0.5, 2.6, seed=7), M["flash"] - 0.05, -24)
    music.add(choir(["E4", "B4", "D#5", "F#5", "G#5"], 5.5, 1.0, 2.4, seed=8), M["open"] + 0.15, -21)
    music.add(choir(["E4", "G#4", "B4", "F#5"], 4.0, 0.3, 2.5, seed=9), M["lock"] - 0.05, -23)
    music.add(choir(["E4", "B4", "D#5", "F#5", "G#5"], 6.0, 0.25, 4.0, seed=10), M["flash2"] - 0.05, -22)

    # ---- plucked arpeggios: eighths at first, sixteenths when the stage heats up
    def arps(a, b, step, level, table=ARPS, inst=pluck, decay=0.8, swing=0.0):
        t, i = a, 0
        while t < b - 1e-6:
            name = chord_at(t)
            if name in table:
                note = table[name][i % 8]
                tone = inst(hz(note), 1.6, decay, 0.7, seed=i) if inst is pluck else inst(note, 1.8, decay, seed=i)
                accent = 0 if i % 4 == 0 else -2.5
                music.add(tone, t + (swing if i % 2 else 0), level + accent, pan=0.35 * np.sin(i * 0.9))
            t += step
            i += 1

    arps(M["bench"], M["warp"], 0.25, -27)
    arps(M["back"] + 1.5, M["lasers"], 0.25, -28)
    arps(M["lasers"], M["pillars"] - 0.5, 0.125, -29)
    arps(M["device"] + 1, M["tag"], 0.125, -28)
    arps(M["open"] + 0.5, M["back"] - 0.25, 0.25, -24, GOLD_ARPS, celesta, 1.4)

    # ---- drums
    def beat(a, b, style, level=0.0):
        t = a
        while t < b - 1e-6:
            pos = round((t - a) / 0.125)
            beat_in_bar = round(((t % 2.0) + 2.0) % 2.0 / 0.5, 3)
            on_beat = pos % 4 == 0
            if style == "light":
                if on_beat and beat_in_bar in (0, 2):
                    music.add(kick(punch=0.8), t, -19.5 + level)
                if on_beat and beat_in_bar in (1, 3):
                    music.add(snap(21 + pos), t, -27 + level, pan=0.08)
                if pos % 4 == 2:
                    music.add(hat(seed=31 + pos), t, -36 + level, pan=0.3)
            elif style == "drive":
                if on_beat:
                    music.add(kick(), t, -18 + level)
                if on_beat and beat_in_bar in (1, 3):
                    music.add(snap(21 + pos), t, -24 + level, pan=0.06)
                if pos % 2 == 1 or pos % 4 == 2:
                    music.add(hat(seed=31 + pos), t, (-33 if pos % 4 == 2 else -38) + level, pan=0.3)
                if beat_in_bar == 3.5 and pos % 2 == 0:
                    music.add(hat(True, seed=33), t, -35 + level, pan=-0.25)
            elif style == "soft":
                if on_beat and beat_in_bar == 0:
                    music.add(kick(punch=0.6), t, -24 + level)
                if pos % 2 == 0:
                    music.add(shaker(41 + pos), t, (-33 if pos % 4 == 2 else -37) + level, pan=0.25)
            t += 0.125

    beat(M["bench"], M["warp"] - 0.01, "light")
    beat(M["back"] + 1.5, M["lasers"], "light")
    beat(M["lasers"], M["pillars"] - 0.5, "drive")
    beat(M["swarm"], M["garden"], "soft")
    beat(M["device"] + 1, M["tag"], "drive", 0.5)
    for t in np.arange(M["device"], M["device"] + 1, 0.125):  # a roll into the last build
        music.add(snap(int(t * 100)), t, -36 + 12 * (t - M["device"]), pan=0.05)

    # ---- the opening: a button drawn by light
    sfx.add(glass(3950, 1.2, 0.5, 1), M["photon"], -27, 0.0)
    draw_n = samples(M["draw1"] - M["draw0"] + 0.3)
    tt = times(draw_n)
    prog = ease_io(tt / (M["draw1"] - M["draw0"]))
    drawing = np.sin(TAU * np.cumsum(1100 + 1300 * prog) / SR) * 0.3 + norm(shape(noise(draw_n, 5), band(lambda t: 6500 + 0 * t, 0.5)))
    drawing *= swell(draw_n, 0.25, 0.35, 1.2)
    sfx.add(pan2(norm(drawing), 0.5 * np.cos(-np.pi / 2 + prog * TAU)), M["draw0"], -31)
    sfx.add(glass(hz("E6"), 2.0, 0.9, 2), M["draw1"], -26, 0.1)
    sfx.add(glass(hz("B6"), 2.0, 0.7, 3), M["draw1"] + 0.06, -30, -0.1)

    # ---- presses: a soft thump, the click of a real button, a wave of light
    for t0, power in ((M["press1"], 0.0), (M["press2"], 3.5)):
        sfx.add(thump(0.6, 74, 0.16), t0, -15 + power)
        sfx.add(click(2900, 0.05, 7), t0 + 0.012, -23 + power * 0.5)
        sfx.add(click(3300, 0.04, 8, 0.2), t0 + 0.3, -31)
        sfx.add(whoosh(1.8, 900, 160, 0.12, 0.9, seed=int(t0 * 10)), t0, -24 + power)
        big.add(boom(2.4, 38, 64, 0.7), t0, -26 + power)
    sfx.add(whoosh(1.4, 1600, 260, 0.1, 0.8, seed=77), M["press2"] + 0.16, -28)

    # ---- the circle of light opens, its name appears, then it closes into the button
    sfx.add(whoosh(1.1, 500, 4200, 0.62, 0.8, seed=12), M["home"] - 0.1, -26)
    for i, note in enumerate(["B5", "E6", "G#6", "B6"]):
        music.add(bell(note, 3.2, 1.3, seed=i), M["home"] + 0.5 + 0.25 * i, -27 - 1.5 * i, pan=-0.3 + 0.2 * i)
    rim = sparkle(1.3, 26, 3000, 7000, seed=13, density=lambda p: np.sin(np.pi * p))
    sfx.add(rim, M["home"] + 0.5, -33)
    close = reverse(whoosh(0.7, 3000, 400, 0.2, 0.7, seed=14))
    sfx.end_at(close, M["press2"] - 0.05, -27)

    # ---- the ring becomes a screen; a flash into the light
    music.add(riser(M["flash"] - M["morph"], 240, 7000, (165, 1320), seed=15), M["morph"], -24)
    sfx.end_at(reverse(highpass(noise(samples(0.9), 16), 3000) * np.exp(-times(samples(0.9)) / 0.25)), M["flash"], -26)
    big.add(boom(3.5, 32, 80, 1.6), M["flash"], -17.5)
    sfx.add(norm(highpass(noise(samples(2.0), 17), 2500) * np.exp(-times(samples(2.0)) / 0.45)), M["flash"], -25)
    for i, note in enumerate(["E3", "B3", "E4", "G#4", "B4", "F#5"]):
        music.add(pluck(hz(note), 3.0, 1.8, 0.75, seed=40 + i), M["flash"] + 0.01 * i, -21, pan=-0.4 + 0.16 * i)
    music.add(bell("E6", 4, 2.0, 5), M["flash"], -25)
    sfx.add(whoosh(1.1, 2500, 5200, 0.5, 0.6, seed=18), M["flash"] + 0.9, -33, 0)

    # ---- the workbench: a line of light assembles it
    scan = M["bench"] + 0.05, M["bench"] + 1.75
    n = samples(scan[1] - scan[0] + 0.4)
    tt = times(n)
    pos = np.clip(ease_io(tt / (scan[1] - scan[0])), 0, 1)
    hum = (np.sin(TAU * 1760 * tt) * 0.25 + norm(shape(noise(n, 19), band(lambda t: 3000 + 2500 * np.clip(t / 1.7, 0, 1), 0.6)))) * swell(n, 0.2, 0.45, 1)
    sfx.add(pan2(norm(hum), pos * 1.6 - 0.8), scan[0], -30)
    for x in (200, 416, 511, 605, 633, 650, 755, 1167, 1222, 1249, 1271, 1320):
        p = min(1, max(0, (x + 80) / 1680))
        u = np.cbrt(p / 4) if p < 0.5 else 1 - np.cbrt(2 * (1 - p)) / 2
        t0 = scan[0] + u * (scan[1] - scan[0])
        sfx.add(click(2200 + x, 0.04, int(x), 0.5), t0, -34, pan=(x / 1560) * 1.6 - 0.8)
    sfx.add(whoosh(1.6, 180, 900, 0.55, 0.8, seed=20), M["explode"] + 0.1, -25)
    for i in range(4):
        sfx.add(thump(0.4, 120 + 30 * i, 0.08), M["explode"] + 0.6 + 0.3 * i, -29 + i)
    for i in range(4):
        sfx.add(click(2400 + 200 * i, 0.04, 30 + i, 0.6), M["explode"] + 1.4 + 0.16 * i, -32, pan=0.6)
    sfx.end_at(reverse(whoosh(1.0, 900, 180, 0.3, 0.8, seed=22)), M["implode"] + 0.9, -26)
    sfx.add(click(1800, 0.06, 23, 0.8), M["implode"] + 0.9, -25)
    sfx.add(thump(0.4, 95, 0.1), M["implode"] + 0.9, -26)

    # ---- the launch pad: words typed, light in flight, the arrow
    sfx.add(whoosh(0.9, 700, 2400, 0.5, 0.7, seed=24), M["launch"] + 0.05, -31)
    for k in range(5):
        sfx.add(key_tap(60 + k), M["type"] + 0.25 * k, -25 + (k % 2), pan=-0.15 + 0.07 * k)
    sfx.add(zap(0.55, 2400, 700, 25), M["fly"], -21, 0.2)
    sfx.add(glass(hz("B6"), 1.6, 0.45, 26), M["fly"] + 0.52, -23, 0.35)
    sfx.add(riser(0.62, 500, 9000, (400, 2600), seed=27), M["warp"] - 0.02, -24)

    # ---- the narrow way: a thread of light; a few steps more; then the world opens wide
    n = samples(M["open"] - M["slit"] + 0.6)
    tt = times(n)
    thread = (np.sin(TAU * hz("E6") * tt) + 0.35 * np.sin(TAU * hz("B6") * tt + 1)) * (1 + 0.15 * np.sin(TAU * 4.5 * tt))
    air = norm(shape(noise(n, 28), band(lambda t: 2400 + 1600 * t, 0.9)))
    sfx.add(norm(thread * 0.6 + air * 0.5) * swell(n, 0.25, 0.5, 1.4), M["slit"], -29)
    music.add(pad(["B1", "F#2"], M["open"] - M["slit"] + 1.0, 500, 0.4, 0.8, seed=29), M["slit"], -31)
    notes = [n_ + str(o) for o in (4, 5, 6) for n_ in ("E", "F#", "G#", "B", "C#")] + ["E7"]
    for i, note in enumerate(notes):
        t0 = M["open"] + 0.5 * (i / len(notes)) ** 0.9
        music.add(pluck(hz(note), 2.6, 1.4, 0.8, seed=200 + i), t0, -25 + 4 * i / len(notes), pan=-0.7 + 1.4 * i / len(notes))
    big.add(boom(4.0, 36, 52, 2.2), M["open"] + 0.45, -25.5)
    sfx.add(whoosh(1.6, 600, 9000, 0.45, 1.0, seed=30), M["open"] - 0.2, -27)
    sfx.add(sparkle(4.2, 7, 4000, 9500, seed=31, decay=0.25), M["open"] + 0.6, -31)
    # what was written flies out over the sea to the sun, and arrives
    c0, c1 = M["open"] + 0.45, M["open"] + 2.35
    n = samples(c1 - c0)
    tt = times(n)
    trip = norm(shape(noise(n, 32), band(lambda t: 5200 * (1400 / 5200) ** np.clip(t / (c1 - c0), 0, 1), 0.5)))
    trip = trip * np.clip(tt / 0.1, 0, 1) * (1 - tt / (c1 - c0)) ** 1.2
    sfx.add(pan2(trip, 0.6 * (1 - tt / (c1 - c0))), c0, -30)
    music.add(bell("E6", 4.0, 2.2, 33), c1, -22, 0.0)
    music.add(bell("B6", 3.0, 1.6, 34), c1 + 0.12, -28, 0.15)
    sfx.add(whoosh(1.6, 300, 1800, 0.2, 0.8, seed=35), c1, -30)

    # ---- back to the search; the stage: rehearsal, bursts, lasers, lights
    sfx.add(reverse(whoosh(0.7, 4000, 600, 0.3, 0.8, seed=36)), M["back"] - 0.55, -25)
    sfx.add(thump(0.4, 90, 0.08), M["back"] + 0.6, -27)
    r0 = M["rehearse"]
    sfx.add(zap(0.5, 2400, 800, 37), r0 + 0.75, -24, 0.2)
    sfx.end_at(reverse(zap(0.5, 2400, 800, 38)), r0 + 1.75, -25, 0.1)
    for i, b0 in enumerate((M["burst"], M["burst"] + 0.35, M["burst"] + 0.7)):
        sfx.add(zap(0.3, 3000, 1100, 39 + i), b0, -23 - i, 0.25)
        sfx.add(glass(hz("E7") if i == 2 else hz("B6"), 0.8, 0.25, 42 + i), b0 + 0.3, -29, 0.35)
    sfx.add(whoosh(0.7, 400, 2000, 0.4, 0.7, seed=45), M["sheet"] + 0.7, -28)
    sfx.add(click(2200, 0.05, 46, 0.9), M["lasers"] - 0.4, -24, 0.4)
    sfx.add(click(3100, 0.04, 47, 0.4), M["lasers"] - 0.33, -30, 0.4)
    lane_pan = {"H": 0.0, "V1": -0.25, "V2": 0.1}
    for s in shots:
        d = min(0.22, s["dur"] * 0.2)
        f0, f1 = (3600, 1800) if s["lane"] == "H" else (2900, 1500)
        p = lane_pan[s["lane"]] + (0.3 if s["rev"] else -0.3) * (s["lane"] == "H")
        sfx.add(pew(d, f0, f1, int(s["t0"] * 100)), s["t0"], -31, p)
    lights = M["show"] - 0.25
    sfx.add(thump(0.7, 62, 0.2), lights, -17)
    sfx.add(norm(bandpass(noise(samples(0.5), 48), 300, 1600) * np.exp(-times(samples(0.5)) / 0.06)), lights, -25)
    big.add(boom(2.5, 40, 90, 0.9), lights, -27.5)
    sfx.add(whoosh(1.4, 200, 1400, 0.3, 0.9, seed=49), lights + 0.05, -28)

    # ---- the console: aurora, glass, six dials, a touch
    sfx.add(whoosh(1.1, 1800, 7000, 0.45, 0.7, seed=50), M["console"], -26)
    sfx.add(whoosh(1.0, 300, 1200, 0.5, 0.8, seed=51), M["console"] + 0.3, -30)
    sfx.add(sparkle(1.6, 14, 2500, 6500, seed=52, density=lambda p: 1 - p), M["console"] + 0.6, -32)
    knobs = [(50, 84), (50, 22), (50, 74), (50, 92), (50, 72), (50, 96)]
    for i, (a, b) in enumerate(knobs):
        t0 = M["knobs"] + 0.5 * i
        last = None
        for ms in range(0, 860, 2):
            v = a + (b - a) * float(ease_io(ms / 850))
            step = int(v // 2)
            if last is not None and step != last:
                sfx.add(click(4200, 0.02, ms + 10 * i, 0.3), t0 + ms / 1000, -38, pan=-0.45)
            last = step
        sfx.add(click(1900, 0.05, 60 + i, 0.8), t0, -31, pan=-0.45)
    sfx.add(glass(hz("G#6"), 1.6, 0.6, 61), M["knobs"] + 2.7, -27, 0.4)
    sfx.add(sparkle(1.0, 18, 3500, 8000, seed=62), M["knobs"] + 2.7, -34)

    # ---- four places: four pillars, four notes; one line; one point
    pillar_notes = [("E3", "E5", bell), ("G#3", "G#4", None), ("B2", "B3", None), ("E4", "E5", None)]
    for k, (low, high, _) in enumerate(pillar_notes):
        t0 = M["pillars"] + 0.5 * k
        big.add(boom(2.5, 36 + 4 * k, 70, 0.9), t0, -25.5)
        sfx.end_at(reverse(whoosh(0.45, 6000, 1200, 0.25, 0.7, seed=70 + k)), t0 + 0.02, -31)
        if k == 0:
            music.add(bell(high, 4, 2.0, 71), t0, -20, -0.45)
            music.add(bell(low, 4, 2.4, 72), t0, -22, -0.45)
        elif k == 1:
            music.add(pluck(hz(high), 3.5, 2.0, 0.8, 73), t0, -19, -0.15)
            music.add(choir([high, "B4"], 3.0, 0.15, 2.0, 74), t0, -27, -0.15)
        elif k == 2:
            music.add(thump(1.4, hz(low), 0.6), t0, -16, 0.15)
            music.add(pluck(hz(high), 3.0, 1.6, 0.5, 75), t0, -20, 0.15)
        else:
            synth = pad([high, "B5"], 2.5, 3800, 0.01, 2.2, 0.18, 3, seed=76)
            music.add(synth * np.exp(-times(synth.shape[1]) / 0.9), t0, -16, 0.45)
            music.add(bell("B6", 3, 1.4, 77), t0, -27, 0.45)
    music.add(riser(M["point"] - M["converge"], 300, 8000, (247, 1976), seed=78), M["converge"], -22)
    sfx.add(zap(0.42, 1200, 6000, 79), M["point"], -27)
    sfx.add(glass(hz("E7"), 3.0, 1.0, 80), M["point"] + 0.42, -21)
    sfx.end_at(reverse(bell("E6", 1.6, 0.6, 81)), M["point"] + 0.42, -28)
    n = samples(M["lock"] - M["point"] - 0.3)
    tt = times(n)
    hold = np.sin(TAU * hz("E6") * tt) * (1 + 0.08 * np.sin(TAU * 5 * tt)) + 0.2 * np.sin(TAU * hz("B6") * tt)
    music.add(norm(hold) * swell(n, 0.3, 0.6, 1.2), M["point"] + 0.45, -31)

    # ---- the name: 灵感台
    big.add(boom(4.5, 30, 84, 2.0), M["lock"], -16.5)
    for i, note in enumerate(["E2", "B2", "E3", "G#3", "B3", "F#4", "G#4", "B4"]):
        music.add(pluck(hz(note), 4.5, 2.6, 0.7, seed=90 + i), M["lock"] + 0.008 * i, -20, pan=-0.5 + 0.14 * i)
    for i, note in enumerate(["B4", "E5", "G#5", "B5", "E6"]):
        music.add(bell(note, 4.0, 1.8, seed=95 + i), M["lock"] + 0.25 * i, -22 - i, pan=-0.3 + 0.15 * i)
    gather = sparkle(1.6, 60, 2500, 9000, seed=101, decay=0.12, density=lambda p: 0.2 + 1.6 * p ** 1.5)
    sfx.add(gather * swell(gather.shape[1], 0.3, 0.2, 1), M["lock"] + 0.15, -27)
    music.add(bell("E6", 4.0, 2.0, 102), M["lock"] + 1.45, -24, 0.2)
    sfx.add(whoosh(1.3, 2600, 6000, 0.5, 0.6, seed=103), M["lock"] + 2.2, -32)

    # ---- one more thing: the residents
    sfx.add(whoosh(0.8, 300, 2400, 0.4, 0.8, seed=110), M["cut"] - 0.05, -30)
    sfx.add(scratch(0.8, 111), M["pen"], -27, -0.2)
    sfx.add(glass(hz("E6"), 1.5, 0.5, 112), M["lueurs"], -24, -0.25)
    sfx.add(glass(hz("C#6"), 1.5, 0.6, 113), M["lueurs"] + 0.3, -25, -0.1)
    swarm = sparkle(2.6, 40, 2200, 8000, seed=114, decay=0.15, density=lambda p: np.sin(np.pi * min(1, p * 1.1)) + 0.05)
    sfx.add(swarm, M["swarm"], -29)
    sfx.add(whoosh(2.6, 400, 3000, 0.4, 0.9, seed=115), M["swarm"], -31)
    for i, note in enumerate(["E5", "F#5", "G#5", "B5", "C#6", "E6", "F#6"]):
        sfx.add(glass(hz(note), 1.2, 0.4, 120 + i), M["swarm"] + 2.0 + 0.08 * i, -26, pan=-0.6 + 0.2 * i)
    hit = M["meet"] + 0.9
    sfx.add(glass(3300, 1.3, 0.35, 130), hit, -21, 0.05)
    sfx.add(glass(4700, 1.0, 0.25, 131), hit + 0.004, -25, 0.1)
    for i, note in enumerate(["E5", "F#5", "G#5", "B5", "C#6", "E6", "F#6", "G#6", "B6"]):
        music.add(celesta(note, 1.6, 0.9, 140 + i), M["stars"] + 0.11 * i, -25, pan=-0.6 + 0.15 * i)
    sfx.add(thump(0.3, 220, 0.05), M["hold"], -29)
    sfx.add(glass(hz("G#6"), 1.2, 0.45, 150), M["hold"] + 0.15, -29, 0.2)
    # the music box sings the residents' tune, two bars a line
    melody = [  # (beat from M.cut + 1, note, beats)
        (0, "G#5", 1), (1, "B5", 1), (2, "E6", 2), (4, "E6", 1), (5, "C#6", 1), (6, "B5", 1), (7, "G#5", 1),
        (8, "A5", 1), (9, "C#6", 1), (10, "E6", 1.5), (11.5, "C#6", 0.5), (12, "B5", 2), (14, "F#5", 1), (15, "D#6", 1),
        (16, "E6", 1), (17, "G#6", 1), (18, "F#6", 1), (19, "E6", 1), (20, "G#5", 1.5), (21.5, "B5", 0.5), (22, "C#6", 2),
        (24, "E6", 1), (25, "C#6", 1), (26, "A5", 2)]
    start = M["cut"] + 1
    music.add(musicbox("B5", 2.0, 0.9, 160), M["cut"] + 0.5, -26)
    for beat_, note, length in melody:
        music.add(musicbox(note, 2.4, 0.8 + 0.25 * length, 161 + int(beat_ * 2)), start + 0.5 * beat_, -21, pan=0.15)
    loop = M["loop"]
    n = samples(1.6)
    tt = times(n)
    swirl = norm(shape(noise(n, 170), band(lambda t: 900 + 1600 * np.sin(np.pi * np.clip(t / 1.6, 0, 1)), 0.7))) * swell(n, 0.5, 0.6, 1.2)
    sfx.add(pan2(swirl, 0.7 * np.sin(TAU * tt / 1.6)), loop, -29)
    sfx.add(sparkle(1.1, 20, 3000, 7000, seed=171), loop + 0.4, -33)
    flick = loop + 1.5
    sfx.add(click(3600, 0.04, 172, 0.3), flick - 0.05, -30, 0.3)
    sfx.add(whoosh(0.45, 1500, 5000, 0.3, 0.6, seed=173), flick - 0.05, -27, 0.35)
    for i, note in enumerate(["B5", "E6", "G#6", "B6", "E7"]):
        music.add(bell(note, 3.0, 1.4, 174 + i), flick + 0.15 + 0.14 * i, -28 - i, pan=0.4 - 0.18 * i)
    # the back garden: the lullaby slows, warm, and the fireflies come out
    for beat_, note in ((0, "E6"), (2, "B5"), (4, "G#5"), (5, "F#5"), (6, "E5"), (8, "B5"), (10, "E6")):
        music.add(musicbox(note, 3.2, 1.6, 180 + beat_), M["garden"] + 0.5 * beat_, -26, pan=-0.1)
    flies = sparkle(M["device"] - M["garden"] - 0.6, 3.5, 3500, 7500, seed=181, decay=0.4)
    sfx.add(flies, M["garden"] + 0.6, -36)
    sfx.add(lowpass(norm(noise(samples(1.6), 182)), 900) * swell(samples(1.6), 0.6, 0.9, 1), M["garden"] - 0.3, -36)

    # ---- made for one screen
    D = M["device"]
    sfx.add(whoosh(1.5, 220, 1600, 0.6, 0.9, seed=190), D + 0.1, -25, 0.2)
    sfx.add(thump(0.5, 80, 0.12), D + 1.3, -24)
    sfx.add(whoosh(2.0, 2400, 6000, 0.5, 0.6, seed=191), D + 2.0, -34)
    for i in range(4):
        t0 = M["specs"] + 0.5 * i
        big.add(boom(1.6, 42, 110, 0.45), t0, -23.5)
        sfx.add(thump(0.35, 110, 0.07), t0, -19, 0.35)
        sfx.add(click(2400, 0.05, 192 + i, 0.6), t0, -26, 0.35)
        sfx.add(norm(highpass(noise(samples(0.4), 196 + i), 3000) * np.exp(-times(samples(0.4)) / 0.06)), t0, -31, 0.35)
    for i, steps in ((0, 14), (2, 12), (3, 12)):
        t0 = M["specs"] + 0.5 * i
        prev = 0
        for ms in range(0, 900, 3):
            c = float(ease_out(ms / 900))
            step = int(c * steps + 1e-9)
            if step != prev:
                sfx.add(click(5200, 0.015, ms + i, 0.2), t0 + ms / 1000, -38, 0.4)
            prev = step

    # ---- launch from here: a line of light, then the last bloom; stay for the light
    T = M["tag"]
    sfx.add(reverse(whoosh(0.9, 3000, 400, 0.3, 0.8, seed=200)), T - 0.2, -29)
    n = samples(M["flash2"] - (T + 0.95))
    tt = times(n)
    line = np.sin(TAU * np.cumsum(hz("B4") * 2 ** (tt / (n / SR))) / SR) * (tt / (n / SR)) ** 1.5
    sfx.add(norm(line), T + 0.95, -30)
    music.add(riser(M["flash2"] - T - 0.6, 300, 9000, (247, 1976), seed=201), T + 0.6, -22)
    big.add(boom(5.0, 30, 90, 2.4), M["flash2"], -15.5)
    sfx.add(norm(highpass(noise(samples(3.0), 202), 2400) * np.exp(-times(samples(3.0)) / 0.7)), M["flash2"], -24)
    for i, note in enumerate(["E2", "B2", "E3", "B3", "D#4", "F#4", "G#4", "B4", "E5"]):
        music.add(pluck(hz(note), 5.5, 3.0, 0.72, seed=210 + i), M["flash2"] + 0.01 * i, -20, pan=-0.6 + 0.15 * i)
    for i, note in enumerate(["B5", "E6", "G#6", "B6"]):
        music.add(bell(note, 4.0, 2.0, 220 + i), M["flash2"] + 1.0 + 0.5 * i, -26 - i, pan=-0.2 + 0.15 * i)
    music.add(celesta("F#6", 2.5, 1.3, 225), M["flash2"] + 3.0, -27)
    music.add(celesta("E6", 3.5, 2.0, 226), M["flash2"] + 3.5, -26)
    ring = M["flash2"] + 2.9
    sfx.add(glass(hz("E7"), 0.8, 0.2, 227), ring - 1.0, -36)
    sfx.add(click(2900, 0.05, 228), ring, -30)
    music.add(bell("E6", 5.0, 2.6, 229), ring + 0.01, -22)
    music.add(bell("B6", 4.0, 2.0, 230), ring + 0.02, -29, 0.12)


# ---------------------------------------------------------------- master
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


def limit(x, ceiling_db=-1.2, lookahead=0.005, release=0.12):
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
    y = x * gain
    return np.clip(y, -ceiling, ceiling)


def master(target=-16.0):
    music_x, sfx_x, big_x = music.x[:, :LENGTH], sfx.x[:, :LENGTH], highpass(big.x[:, :LENGTH], 38, 2)
    # the music breathes with the scenes: closed into the dive, opened onto the gold, closed at the dark
    def cutoff(t):
        c = np.full_like(t, 18000.0)
        for a, b, lo, hi in ((M["warp"] - 0.4, M["slit"], 18000, 700), (M["slit"], M["open"], 700, 700),
                             (M["open"], M["open"] + 0.6, 700, 18000), (M["dark"] - 0.5, M["dark"], 18000, 500),
                             (M["dark"], M["cut"], 500, 500), (M["tag"] - 0.1, M["tag"] + 0.4, 18000, 1200),
                             (M["tag"] + 0.4, M["flash2"] - 0.6, 1200, 1200), (M["flash2"] - 0.6, M["flash2"], 1200, 18000)):
            m = (t >= a) & (t < b)
            c[m] = lo * (hi / lo) ** ((t[m] - a) / max(b - a, 1e-6))
        return c
    music_x = shape(music_x, lowpass_moving(lambda t: cutoff(t), 2))
    # silence where the film holds its breath
    t = times(LENGTH)
    hush = np.ones(LENGTH)
    hush[(t > M["dark"]) & (t < M["cut"] - 0.1)] = 0.0
    edge = (t >= M["dark"] - 0.35) & (t <= M["dark"])
    hush[edge] = np.cos((t[edge] - (M["dark"] - 0.35)) / 0.35 * np.pi / 2) ** 2
    music_x = music_x * hush
    # the kick lightly pumps the pads and bass in the driving parts
    hall = reverb_ir(2.9, 4.5, 0.03, 7500, 2400, 1)
    room = reverb_ir(1.5, 2.5, 0.012, 9000, 3500, 2)
    wet = convolve(music_x, hall) * 0.34 + convolve(sfx_x, room) * 0.2 + convolve(big_x, hall) * 0.3
    mix = music_x + sfx_x + big_x + wet
    mix = highpass(mix, 32, 2)
    mix = signal.lfilter(*shelf(3000, 4.0), mix, axis=-1)
    # a faint room tone in the held breath, so the silence is a place, not a dropout
    tone = lowpass(np.vstack([noise(LENGTH, 300), noise(LENGTH, 301)]), 600) * db(-62)
    mix += tone * ((t > M["dark"]) & (t < M["cut"]))
    mix *= edges(LENGTH, 0.01, 1.8)
    for _ in range(3):
        lufs, _, _ = loudness(mix)
        mix = limit(mix * db(target - lufs))
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
        print(f"wrote {path.resolve().relative_to(ROOT)} ({path.stat().st_size // 1024} KB)")
    if args.report:
        report(mix, starts, lk, args.report)


if __name__ == "__main__":
    sys.exit(main())
