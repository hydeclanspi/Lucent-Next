"""The desk: buses, sends to shared rooms, sidechains, automation, and a master that keeps the dynamics.

Each bus: EQ, saturation, compression, ducking under the kick, a gain that follows the scene (automation,
in dB over time), stereo width; post-fader sends to a room, a plate, a hall and a ping-pong echo. The
master glues the mix lightly and limits only the peaks, so a quiet scene stays quiet.
"""
import numpy as np

from .clock import LENGTH, SR
from .dsp import (compress, convolve, curve, db, eq, fade, hp, limit, loudness, loudness_range, lp, mono_lows, moving_lowpass,
                  noise, pan2, pingpong, reverb_ir, samples, saturate, shape, times, true_peak, width)

PAD = samples(8)


class Bus:
    def __init__(self, name, gain=0.0, eq=(), drive=0.0, comp=None, duck=0.0, duck_release=0.12, sends=None, width=1.0,
                 auto=None, highpass=None, lowpass=None, cutoff=None):
        self.name = name
        self.x = np.zeros((2, LENGTH + PAD))
        self.gain, self.eq, self.drive, self.comp = gain, eq, drive, comp
        self.duck, self.duck_release = duck, duck_release
        self.sends = sends or {}
        self.width, self.auto = width, auto
        self.highpass, self.lowpass = highpass, lowpass
        self.cutoff = cutoff   # keyframes (time, Hz): a low-pass that opens and closes with the scenes

    def add(self, sig, t, gain_db=0.0, pan=0.0):
        if sig is None:
            return
        s = sig if sig.ndim == 2 else pan2(sig, pan)
        if sig.ndim == 2 and pan:  # balance a stereo sound towards one side
            s = np.vstack([s[0] * min(1.0, 1 - pan), s[1] * min(1.0, 1 + pan)])
        i = int(round(t * SR))
        j = i + s.shape[1]
        a, b = max(i, 0), min(j, self.x.shape[1])
        if b > a:
            self.x[:, a:b] += float(db(gain_db)) * s[:, a - i:b - i]

    def end_at(self, sig, t, gain_db=0.0, pan=0.0):
        """Place a sound so that it ends at t (for things played backwards)."""
        self.add(sig, t - sig.shape[-1] / SR, gain_db, pan)


class Mixer:
    ROOMS = {"room": dict(rt60=0.7, pre=0.006, seed=2, early=0.9), "plate": dict(rt60=1.6, pre=0.012, seed=3, early=0.2, damp=(1.0, 1.0, 1.0, 0.9, 0.75)),
             "hall": dict(rt60=2.6, pre=0.024, seed=1, early=0.5)}

    def __init__(self):
        self.buses = {}
        self.kicks = []
        self.breaths = []   # windows of silence: (start, end, fade out, fade in)
        self.room_tone = []

    def bus(self, name, **opts):
        if name not in self.buses:
            self.buses[name] = Bus(name, **opts)
        return self.buses[name]

    def __getitem__(self, name):
        return self.buses[name]

    def kick_mark(self, t, weight=1.0):
        self.kicks.append((t, weight))

    def ducking(self, depth, release):
        g = np.ones(LENGTH + PAD)
        for t, weight in self.kicks:
            i = int(round(t * SR))
            if i >= len(g):
                continue
            n = min(len(g) - i, samples(release * 6))
            tt = times(n)
            d = depth * weight * np.clip(tt / 0.004, 0, 1) * np.exp(-np.maximum(0, tt - 0.004) / release)
            g[i:i + n] = np.minimum(g[i:i + n], 1 - d)
        return g

    def breath(self):
        """1 everywhere except the held breaths, where the music falls silent."""
        g = np.ones(LENGTH + PAD)
        t = times(LENGTH + PAD)
        for a, b, fo, fi in self.breaths:
            down = np.clip((t - a) / fo, 0, 1)
            up = np.clip((t - b) / fi, 0, 1) if fi > 0 else (t >= b).astype(float)
            gate = np.cos(down * np.pi / 2) ** 2
            gate = np.where(t >= b, up, gate)
            g = np.where((t >= a) & (t < b + fi), np.minimum(g, gate), g)
        return g

    def render(self):
        t = times(LENGTH + PAD)
        sends = {k: np.zeros((2, LENGTH + PAD)) for k in ("room", "plate", "hall", "echo")}
        dry = np.zeros((2, LENGTH + PAD))
        stems = {}
        breath = self.breath()
        for b in self.buses.values():
            x = b.x
            if not np.any(x):
                continue
            if b.highpass:
                x = hp(x, b.highpass, 2)
            if b.lowpass:
                x = lp(x, b.lowpass, 2)
            if b.cutoff:
                keys = sorted(b.cutoff)
                x = shape(x, moving_lowpass(lambda tt: np.exp(curve(tt, [(k, np.log(v)) for k, v in keys])), 2))
            if b.eq:
                x = eq(x, *b.eq)
            if b.drive:
                x = saturate(x, b.drive, 0.02)
            if b.comp:
                x = compress(x, **b.comp)
            if b.duck:
                x = x * self.ducking(b.duck, b.duck_release)
            g = float(db(b.gain))
            if b.auto is not None:
                g = g * db(b.auto(t))
            x = x * g * breath
            if b.width != 1.0:
                x = width(x, b.width)
            stems[b.name] = x
            dry += x
            for k, v in b.sends.items():
                sends[k] += x * float(db(v))
        wet = np.zeros_like(dry)
        for k in ("room", "plate", "hall"):
            if np.any(sends[k]):
                w = convolve(sends[k], reverb_ir(**self.ROOMS[k]))
                wet += hp(lp(w, 9000, 2), 180 if k != "room" else 120, 2)
        if np.any(sends["echo"]):
            e = pingpong(sends["echo"], 0.375, 0.42, 5, 350, 5200)
            wet += e + 0.25 * convolve(e, reverb_ir(**self.ROOMS["plate"]))
        # the rooms fall silent with the music, a third of a second after it
        n = samples(0.35)
        wet *= np.maximum(breath, np.concatenate([np.ones(n), breath[:-n]]))
        mix = dry + wet
        for a, b in self.room_tone:  # in a held breath, a faint room tone: a silence that is a place
            sel = (t > a) & (t < b)
            tone = lp(np.vstack([noise(LENGTH + PAD, 300), noise(LENGTH + PAD, 301)]), 600) * float(db(-64))
            mix += tone * sel
        return mix[:, :LENGTH], {k: v[:, :LENGTH] for k, v in stems.items()}


TILT = (("lowshelf", 70, -2.5, 0.7), ("peak", 320, -1.5, 0.8), ("peak", 3000, 1.2, 0.8), ("highshelf", 6500, 3.0, 0.7), ("highshelf", 11000, 2.5, 0.7))


def master(mix, target=-16.0, ceiling=-1.0, glue=True, tilt=TILT):
    """Glue lightly, keep the lows in the middle, clear the low-mids and open the top, limit only the
    peaks, and set the level so the whole film sits at `target` LUFS with true peaks under `ceiling` dBTP."""
    x = hp(mix, 28, 2)
    x = mono_lows(x, 130)
    if glue:
        x = compress(x, threshold=-14.0, ratio=1.8, attack=0.03, release=0.25, knee=8.0)
    if tilt:
        x = eq(x, *tilt)
    x = x * fade(x.shape[1], 0.005, 1.5)
    lim = -1.6
    for _ in range(5):
        for _ in range(3):
            lufs, _, _ = loudness(x)
            x = limit(x * float(db(target - lufs)), lim)
        peak = true_peak(x)
        if peak <= ceiling:
            break
        lim -= peak - ceiling + 0.05
    lufs, starts, lk = loudness(x)
    return x, {"lufs": lufs, "peak": true_peak(x), "lra": loudness_range(x), "starts": starts, "momentary": lk}
