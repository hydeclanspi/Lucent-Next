"""Signal processing for the score: oscillators without aliasing, filters, envelopes, space, dynamics, metering.

Everything here works on numpy arrays at 48 kHz: mono (n,) or stereo (2, n).
"""
import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d

from .clock import SR

TAU = 2 * np.pi


# ---------------------------------------------------------------- units
def samples(seconds):
    return max(1, int(round(seconds * SR)))


def times(n):
    return np.arange(n) / SR


def db(x):
    return 10 ** (np.asarray(x, float) / 20)


def mtof(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def norm(x, peak=1.0):
    p = np.max(np.abs(x))
    return x * (peak / p) if p > 0 else x


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)))) if x.size else 0.0


# ---------------------------------------------------------------- envelopes
def fade(n, attack=0.003, release=0.02):
    """Ones, with raised-cosine edges: an attack at the start and a release at the end."""
    e = np.ones(n)
    a, r = min(n, samples(attack)), min(n, samples(release))
    if a > 1:
        e[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r > 1:
        e[n - r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e


def decay(n, tau):
    return np.exp(-times(n) / max(tau, 1e-5))


def held(n, hold, release_tau, attack=0.002):
    """Full level while a key is held for `hold` seconds, then an exponential release."""
    t = times(n)
    e = np.where(t < hold, 1.0, np.exp(-(t - hold) / max(release_tau, 1e-4)))
    return e * fade(n, attack, 0.004)


def swell(n, attack, release, curve=2.0):
    """Rise over `attack` seconds, hold, fall over `release` seconds at the end."""
    t = times(n)
    up = np.clip(t / max(attack, 1e-4), 0, 1) ** curve
    down = np.clip((n / SR - t) / max(release, 1e-4), 0, 1) ** 1.5
    return up * down


def curve(t, keys, ease="sine"):
    """Piecewise interpolation of (time, value) keys at times t, eased between keys."""
    kt = np.array([k[0] for k in keys], float)
    kv = np.array([k[1] for k in keys], float)
    t = np.asarray(t, float)
    i = np.clip(np.searchsorted(kt, t, side="right") - 1, 0, len(kt) - 2)
    span = np.maximum(kt[i + 1] - kt[i], 1e-9)
    p = np.clip((t - kt[i]) / span, 0, 1)
    if ease == "sine":
        p = 0.5 - 0.5 * np.cos(np.pi * p)
    out = kv[i] + (kv[i + 1] - kv[i]) * p
    out = np.where(t <= kt[0], kv[0], out)
    return np.where(t >= kt[-1], kv[-1], out)


# ---------------------------------------------------------------- oscillators
def cycles(freq, n, phase=0.0):
    """Running phase, in cycles, of a frequency that may change every sample."""
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    return phase + np.cumsum(f) / SR - f[0] / SR


def sine(freq, n, phase=0.0):
    return np.sin(TAU * cycles(freq, n, phase))


def _blep(ph, dt):
    y = np.zeros_like(ph)
    m = ph < dt
    x = ph[m] / dt[m]
    y[m] = x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]
    y[m] = x * x + x + x + 1
    return y


def saw(freq, n, phase=0.0):
    """Band-limited sawtooth (polyBLEP); the frequency may change every sample."""
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    dt = np.minimum(f / SR, 0.49)
    ph = cycles(f, n, phase) % 1.0
    return 2 * ph - 1 - _blep(ph, dt)


def square(freq, n, phase=0.0, width=0.5):
    """Band-limited pulse: two sawtooths a pulse width apart."""
    return 0.5 * (saw(freq, n, phase) - saw(freq, n, phase + width))


def triangle(freq, n, phase=0.0):
    ph = cycles(freq, n, phase) % 1.0
    return 4 * np.abs(ph - 0.5) - 1


# ---------------------------------------------------------------- filters
def _sos(b, a):
    b = np.asarray(b, float) / a[0]
    a = np.asarray(a, float) / a[0]
    return np.concatenate([b, a])[None, :]


def biquad(kind, f, q=0.7071, gain_db=0.0):
    """RBJ audio EQ cookbook biquads as second-order sections."""
    f = min(max(f, 10.0), SR * 0.49)
    A = 10 ** (gain_db / 40)
    w = TAU * f / SR
    c, s = np.cos(w), np.sin(w)
    al = s / (2 * q)
    if kind == "lowpass":
        return _sos([(1 - c) / 2, 1 - c, (1 - c) / 2], [1 + al, -2 * c, 1 - al])
    if kind == "highpass":
        return _sos([(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al])
    if kind == "bandpass":
        return _sos([al, 0, -al], [1 + al, -2 * c, 1 - al])
    if kind == "peak":
        return _sos([1 + al * A, -2 * c, 1 - al * A], [1 + al / A, -2 * c, 1 - al / A])
    sq = 2 * np.sqrt(A) * al
    if kind == "lowshelf":
        return _sos([A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)],
                    [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq])
    if kind == "highshelf":
        return _sos([A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)],
                    [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq])
    raise ValueError(kind)


def eq(x, *bands):
    """Apply EQ bands: (kind, freq, gain_db, q)."""
    sos = np.concatenate([biquad(k, f, q, g) for k, f, g, q in bands])
    return signal.sosfilt(sos, x, axis=-1)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, min(f, SR * 0.49), "lowpass", fs=SR, output="sos"), x, axis=-1)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, max(f, 5.0), "highpass", fs=SR, output="sos"), x, axis=-1)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [max(lo, 5.0), min(hi, SR * 0.49)], "bandpass", fs=SR, output="sos"), x, axis=-1)


def onepole(x, f):
    a = np.exp(-TAU * f / SR)
    return signal.lfilter([1 - a], [1, -a], x, axis=-1)


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


def moving_lowpass(cutoff_fn, order=2):
    def mask(f, t):
        return 1 / np.sqrt(1 + (f / np.maximum(cutoff_fn(t), 30)) ** (2 * order))
    return mask


# ---------------------------------------------------------------- stereo
def pan2(x, pan=0.0):
    a = (np.clip(np.asarray(pan, float), -1, 1) + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)])


def stereo(x):
    return x if x.ndim == 2 else np.vstack([x, x]) * np.sqrt(0.5)


def width(x, w):
    """Mid/side: 0 is mono, 1 as it is, above 1 wider."""
    m, s = (x[0] + x[1]) / 2, (x[0] - x[1]) / 2
    return np.vstack([m + w * s, m - w * s])


def mono_lows(x, f=140.0):
    """Keep everything below f in the middle."""
    lo = lp(x, f, 4)
    m = lo.mean(0)
    return x - lo + np.vstack([m, m])


def haas(x, ms=9.0, pan=0.0):
    """A mono sound widened by a short delay on one side."""
    d = samples(ms / 1000)
    y = np.concatenate([np.zeros(d), x])[: len(x)]
    return pan2(x, pan) * 0.5 + np.vstack([x, y]) * 0.5 if pan == 0 else pan2(x, pan)


# ---------------------------------------------------------------- colour and dynamics
def saturate(x, drive=1.5, asym=0.0, mix=1.0):
    """Soft saturation; asym adds even harmonics, like tape or a valve."""
    y = np.tanh(drive * (x + asym)) - np.tanh(drive * asym)
    y = y / np.tanh(drive)
    return x + mix * (y - x)


def compress(x, threshold=-18.0, ratio=3.0, attack=0.01, release=0.12, knee=6.0, makeup=0.0, key=None, block=32):
    """A feed-forward compressor with a soft knee, measured on peaks (or on `key`, for a sidechain)."""
    k = x if key is None else key
    k = np.abs(k if k.ndim == 1 else np.max(np.abs(k), axis=0))
    n = len(k) // block * block
    if n == 0:
        return x
    lvl = 20 * np.log10(np.maximum(k[:n].reshape(-1, block).max(1), 1e-9))
    over = lvl - threshold
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 - 1 / ratio), (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    a_c, r_c = np.exp(-block / (attack * SR)), np.exp(-block / (release * SR))
    g = np.empty_like(gr)
    cur = 0.0
    for i, v in enumerate(gr):
        cur = v + (cur - v) * (a_c if v > cur else r_c)
        g[i] = cur
    gain = db(makeup - np.interp(np.arange(x.shape[-1]), np.arange(len(g)) * block + block / 2, g))
    return x * gain


def limit(x, ceiling_db=-1.2, lookahead=0.005, release=0.08):
    ceiling = db(ceiling_db)
    blk = 32
    n = x.shape[-1] // blk * blk
    peaks = np.abs(x[..., :n]).reshape(-1, n).max(0).reshape(-1, blk).max(1) if x.ndim == 2 else np.abs(x[:n]).reshape(-1, blk).max(1)
    want = np.minimum(1, ceiling / np.maximum(peaks, 1e-9))
    ahead = int(np.ceil(lookahead * SR / blk)) + 1
    want = minimum_filter1d(want, size=2 * ahead + 1, origin=0)
    g = np.empty_like(want)
    a = np.exp(-blk / (release * SR))
    cur = 1.0
    for i, w in enumerate(want):
        cur = w if w < cur else w + (cur - w) * a
        g[i] = cur
    gain = np.interp(np.arange(x.shape[-1]), np.arange(len(g)) * blk + blk / 2, g)
    return np.clip(x * gain, -ceiling, ceiling)


# ---------------------------------------------------------------- time and space
def delay_line(x, seconds):
    d = samples(seconds)
    out = np.zeros_like(x)
    if d < x.shape[-1]:
        out[..., d:] = x[..., :-d] if d else x
    return out


def pingpong(x, delay=0.375, feedback=0.4, taps=5, low=300.0, high=5200.0):
    """Echoes left and right in turn, each darker and thinner than the last."""
    y = x.mean(0) if x.ndim == 2 else x
    out = np.zeros((2, y.shape[-1]))
    d = samples(delay)
    cur = y
    for k in range(1, taps + 1):
        cur = hp(lp(cur, high), low) * feedback
        if k * d >= y.shape[-1]:
            break
        out[k % 2, k * d:] += cur[: y.shape[-1] - k * d]
    return out


def chorus(x, rate=0.5, depth=0.0025, base=0.012, mix=0.5, seed=0):
    """Two voices a few milliseconds behind, drifting: a mono sound becomes wide and alive."""
    y = x.mean(0) if x.ndim == 2 else x
    n = len(y)
    t = times(n)
    rng = np.random.default_rng(seed)
    idx = np.arange(n, dtype=float)
    outs = []
    for side in range(2):
        d = (base + depth * np.sin(TAU * rate * (1 + 0.17 * side) * t + rng.random() * TAU)) * SR
        outs.append(np.interp(idx - d, idx, y, left=0.0))
    dry = stereo(x)
    return dry * (1 - mix * 0.5) + mix * np.vstack(outs) * 0.7


def reverb_ir(rt60=2.2, length=None, pre=0.02, damp=(1.25, 1.1, 1.0, 0.75, 0.5), early=0.6, seed=1, spread=1.0):
    """A synthetic room: early reflections, then a diffuse tail that dies faster at the top than at the
    bottom (rt60 scaled per band: <250 Hz, <1 kHz, <3.5 kHz, <8 kHz, above). Stereo and decorrelated."""
    length = length or rt60 * 1.3 + 0.2
    n = samples(length)
    t = times(n)
    rng = np.random.default_rng(seed)
    x = rng.standard_normal((2, n))
    edges_ = [0, 250, 1000, 3500, 8000, SR / 2 - 1]
    tail = np.zeros((2, n))
    for k in range(5):
        lo, hi = edges_[k], edges_[k + 1]
        if lo <= 0:
            b = lp(x, hi, 4)
        elif hi >= SR / 2 - 2:
            b = hp(x, lo, 4)
        else:
            b = bp(x, lo, hi, 2)
        tail += b * 10 ** (-3 * t / (rt60 * damp[k]))
    build = 1 - np.exp(-t / 0.012)  # the tail thickens over the first milliseconds
    tail *= build
    er = np.zeros((2, n))
    for _ in range(18):
        ms = rng.uniform(4, 70)
        k = samples(ms / 1000)
        g = (rng.uniform(0.3, 1.0) * (1 - ms / 90)) * rng.choice([-1, 1])
        side = rng.integers(2)
        er[side, k] += g
        er[1 - side, min(n - 1, k + samples(rng.uniform(0.3, 1.5) / 1000))] += g * 0.7
    er = lp(er, 7000, 2)
    ir = tail / np.sqrt(np.mean(tail ** 2) * n) + early * er / max(1e-9, np.sqrt(np.sum(er ** 2)))
    ir = width(ir, spread)
    ir = np.concatenate([np.zeros((2, samples(pre))), ir * fade(n, 0.0005, min(0.3, length * 0.2))], axis=1)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def convolve(x, ir):
    x2 = stereo(x)
    return np.vstack([signal.oaconvolve(x2[c], ir[c])[: x2.shape[1]] for c in range(2)])


# ---------------------------------------------------------------- metering (ITU-R BS.1770-4)
K_PRE = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
K_RLB = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def _kpower(x):
    y = signal.lfilter(*K_PRE, stereo(x), axis=-1)
    y = signal.lfilter(*K_RLB, y, axis=-1)
    return np.cumsum(np.concatenate([np.zeros((2, 1)), y ** 2], axis=1), axis=1)


def loudness(x, window=0.4):
    """Integrated loudness (LUFS) and the loudness of `window`-second blocks every 100 ms."""
    power = _kpower(x)
    block, hop = samples(window), samples(0.1)
    starts = np.arange(0, power.shape[1] - 1 - block, hop)
    z = (power[:, starts + block] - power[:, starts]) / block
    lk = -0.691 + 10 * np.log10(np.maximum(z.sum(0), 1e-12))
    if window == 0.4:
        gated = z[:, lk > -70]
        if gated.shape[1] == 0:
            return -99.0, starts / SR, lk
        rel = -0.691 + 10 * np.log10(gated.sum(0).mean()) - 10
        keep = z[:, (lk > -70) & (lk > rel)]
        integrated = -0.691 + 10 * np.log10(keep.sum(0).mean())
    else:
        integrated = float("nan")
    return integrated, starts / SR, lk


def loudness_range(x):
    """LRA (EBU Tech 3342): the spread of short-term loudness, 10th to 95th percentile, gated."""
    _, _, st = loudness(x, 3.0)
    st = st[st > -70]
    if len(st) == 0:
        return 0.0
    rel = 10 * np.log10(np.mean(10 ** (st / 10))) - 20
    st = st[st > rel]
    return float(np.percentile(st, 95) - np.percentile(st, 10))


def true_peak(x):
    up = signal.resample_poly(x, 4, 1, axis=-1)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)
