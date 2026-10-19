"""The toolkit a version of the score is written with: a desk set up for a band, patterns played with a
human hand, chord changes, and players that read them (piano, arpeggios, bass, pads, strings, melodies).

Patterns are strings, one character a step: X accent, x normal, o soft, - ghost, . rest. They restart at
the start of each passage, as a band does at a cue.
"""
import zlib

import numpy as np

from . import form, kit, sfx, tonal
from .clock import BEAT, M
from .dsp import fade, mtof, samples, times
from .mixer import TILT, Mixer, master
from .theory import Changes, bass_note, midi, voice

VEL = {"X": 1.0, "x": 0.8, "o": 0.55, "-": 0.32}


def q(v, step=0.05, lo=0.05):
    """Quantize a velocity or a length, so that notes played alike are synthesized once."""
    return max(lo, round(round(v / step) * step, 3))


class Song:
    def __init__(self, title, tonic, mode="major", fader_depth=3.2, sfx_gain=0.0, bell=None, pluck=None):
        self.title = title
        self.tonic, self.mode = midi(tonic) if isinstance(tonic, str) else tonic, mode
        self.mix = Mixer()
        self.ch = Changes()
        self.rng = np.random.default_rng(7)
        self.log = []   # (time, length, midi, role): every pitched note, for checking the harmony
        self.tilt = TILT  # the master's tone: a version may lean it
        auto = lambda t: form.level(t, fader_depth)  # noqa: E731
        b = self.mix.bus
        b("drums", gain=-2, highpass=28, comp=dict(threshold=-10, ratio=3, attack=0.004, release=0.09, knee=6, makeup=1.5), sends={"room": -14}, auto=auto)
        b("perc", gain=0, highpass=200, sends={"room": -10, "plate": -18}, auto=auto)
        b("bass", gain=-4.5, highpass=32, duck=0.35, duck_release=0.09, eq=(("lowshelf", 80, -1.0, 0.7), ("peak", 260, -2, 1.0), ("peak", 900, 1.5, 1.0)), auto=auto)
        b("keys", gain=5, highpass=45, eq=(("peak", 110, 1.0, 0.8), ("peak", 300, -1.0, 1.0), ("peak", 1700, -1.0, 1.0), ("highshelf", 7000, 2.0, 0.7)),
          comp=dict(threshold=-16, ratio=2.2, attack=0.006, release=0.14, knee=8), sends={"plate": -16, "hall": -13}, auto=auto)
        b("felt", gain=5, highpass=45, eq=(("lowshelf", 180, 2.5, 0.7), ("peak", 2800, -3.0, 0.9), ("highshelf", 6000, -6.0, 0.7)), sends={"room": -12, "hall": -15}, auto=auto)
        b("mallets", gain=-6, highpass=120, sends={"plate": -11, "echo": -17}, auto=auto)
        b("plucks", gain=-6, highpass=90, sends={"room": -13, "echo": -16}, auto=auto)
        b("strings", gain=-15, highpass=60, duck=0.12, sends={"hall": -7}, auto=auto)
        b("pads", gain=-15, highpass=80, duck=0.45, duck_release=0.18, sends={"hall": -9}, auto=auto)
        b("brass", gain=-6, highpass=70, sends={"hall": -11}, auto=auto)
        b("lead", gain=-5, highpass=150, sends={"plate": -12, "echo": -13}, auto=auto)
        b("choir", gain=-7, highpass=120, eq=(("highshelf", 6000, 3.0, 0.7),), sends={"hall": -5}, auto=auto)
        b("fx", gain=-4, sends={"hall": -9})
        b("sfx", gain=-3, sends={"room": -14})
        b("sfx_tuned", gain=-5, sends={"plate": -10, "echo": -16})
        self.pal = sfx.Palette(self.tonic, "major" if mode in ("major", "lydian", "mixolydian") else "minor", bell, pluck, sfx_gain)
        # silence where the film holds its breath: the music stops as the machine winds down
        self.mix.breaths.append((M["dark"] - 0.02, M["cut"] - 0.03, 0.32, 0.0))
        self.mix.room_tone.append((M["dark"] + 0.3, M["cut"]))

    # ---------------------------------------------------------------- time
    def hits(self, a, b, pat, step=0.125, swing=0.0, human=0.003, seed=0, vel=1.0):
        """(time, velocity, step index) for every struck step of a pattern repeated from a until b."""
        rng = np.random.default_rng(seed + int(a * 100))
        pat = pat.replace(" ", "")
        k = 0
        t = a
        while t < b - 1e-6:
            c = pat[k % len(pat)]
            if c in VEL:
                tt = t + (swing * step if k % 2 == 1 else 0.0) + rng.normal(0, human)
                v = VEL[c] * vel * (1 + rng.normal(0, 0.05))
                yield max(a - 0.01, tt), float(np.clip(v, 0.05, 1.0)), k
            k += 1
            t = a + k * step

    # ---------------------------------------------------------------- drums
    def kick(self, t, kind="pop", vel=1.0, gain=0.0, duck=True):
        self.mix["drums"].add(kit.kick(kind, round(vel, 2), int(t * 8) % 4), t, gain - 4)
        if duck:
            self.mix.kick_mark(t, min(1.0, vel))

    def groove(self, a, b, parts, gain=0.0, swing=0.0, seed=0):
        """parts: name -> pattern, or (pattern, gain, option). Names: kick, kick:deep, snare, snare:tight,
        rim, brush, clap, snap, hat, ohat, phat, shaker, tamb, tambhit, conga, congahi, bongo, clave, block."""
        for name, spec in parts.items():
            pat, g, opt = (spec, 0.0, None) if isinstance(spec, str) else (spec + (None,))[:3]
            base, _, kind = name.partition(":")
            for t, v, k in self.hits(a, b, pat, swing=swing, seed=seed + zlib.crc32(name.encode()) % 97):
                self.strike(base, kind, t, v, gain + g, k, opt)

    def strike(self, base, kind, t, v, g, k=0, opt=None):
        d, p = self.mix["drums"], self.mix["perc"]
        rr = k % 4
        if base == "kick":
            self.kick(t, kind or "pop", v, g)
        elif base == "snare":
            d.add(kit.snare(kind or "pop", q(v), rr), t, g - 7)
        elif base == "rim":
            d.add(kit.snare("rim", q(v), rr), t, g - 14, -0.2)
        elif base == "brush":
            d.add(kit.snare("brush", q(v), rr), t, g - 14, 0.1)
        elif base == "clap":
            d.add(kit.clap(3, 0.12, q(v), rr), t, g - 6)
        elif base == "snap":
            p.add(kit.snap(q(v), rr), t, g - 9, -0.25 + 0.5 * (k % 2))
        elif base == "hat":
            d.add(kit.hat("closed", q(v), rr + (k % 8)), t, g - 15, 0.28)
        elif base == "ohat":
            d.add(kit.hat("open", q(v), rr), t, g - 17, 0.28)
        elif base == "phat":
            d.add(kit.hat("pedal", q(v), rr), t, g - 20, 0.28)
        elif base == "shaker":
            p.add(kit.shaker(q(v), 0.09, rr + (k % 8)), t, g - 8, 0.35)
        elif base == "tamb":
            p.add(kit.tambourine("shake", q(v), rr), t, g - 16, -0.35)
        elif base == "tambhit":
            p.add(kit.tambourine("hit", q(v), rr), t, g - 16, -0.35)
        elif base == "conga":
            p.add(kit.skin(190, opt or "open", q(v), rr), t, g - 12, -0.3)
        elif base == "congahi":
            p.add(kit.skin(285, opt or "open", q(v), rr), t, g - 13, -0.15)
        elif base == "bongo":
            p.add(kit.skin(430 if k % 2 == 0 else 610, opt or "open", q(v), rr), t, g - 14, 0.3)
        elif base == "clave":
            p.add(kit.wood("clave", q(v), rr), t, g - 15, 0.4)
        elif base == "block":
            p.add(kit.wood("block", q(v), rr), t, g - 15, -0.4)
        elif base == "tom":
            d.add(kit.tom(float(opt or 110), q(v), rr), t, g - 9, 0.2)
        elif base == "taiko":
            d.add(kit.taiko(q(v), rr), t, g - 6)
            self.mix.kick_mark(t, 0.8 * v)
        else:
            raise ValueError(base)

    def fill(self, a, b, kind="snare", g0=-12.0, g1=-2.0, kicks=False):
        """A build: hits in eighths, then sixteenths, then thirty-seconds, louder and higher."""
        t, k = a, 0
        while t < b - 1e-6:
            p = (t - a) / (b - a)
            if kind == "snare":
                self.mix["drums"].add(kit.snare("pop", round(0.5 + 0.5 * p, 2), k % 4), t, g0 + (g1 - g0) * p - 9, 0.06 * np.sin(k))
            elif kind == "tom":
                self.mix["drums"].add(kit.tom(150 - 60 * p, 0.9, k % 4), t, g0 + (g1 - g0) * p - 9, 0.4 - 0.8 * p)
            if kicks and abs(((t - a) / 0.25) - round((t - a) / 0.25)) < 1e-6:
                self.kick(t, "pop", 0.8 + 0.2 * p, -4 + 3 * p)
            t += 0.25 if p < 0.5 else 0.125 if p < 0.8 else 0.0625
            k += 1

    # ---------------------------------------------------------------- weight and air
    def impact(self, t, size=1.0, gain=0.0, crash=True):
        self.mix["fx"].add(kit.impact(round(size, 2), int(t * 10) % 7), t, -8 + 3 * size + gain)
        self.kick(t, "pop", 1.0, gain + 1)
        if crash:
            self.mix["drums"].add(kit.cymbal("crash", 2.8, int(t) % 5), t, -15 + 2 * size + gain, 0.1)

    def rise(self, a, b, gain=0.0, lo=300.0, hi=9000.0, tone=None, seed=0):
        tone = tone or (float(mtof(self.tonic - 12)), float(mtof(self.tonic + 24)))
        self.mix["fx"].add(kit.riser(round(b - a, 3), lo, hi, tone, seed), a, -16 + gain)

    def swell_into(self, t, length=1.0, gain=0.0):
        """A cymbal swelled with soft mallets that ends exactly on t."""
        self.mix["drums"].end_at(kit.cymbal("swell", round(length, 2), int(t) % 3), t, -17 + gain)

    def reverse(self, x, t, bus="fx", gain=0.0):
        self.mix[bus].end_at(x[..., ::-1].copy(), t, gain)

    # ---------------------------------------------------------------- harmony
    def changes(self, a, seq, unit=BEAT):
        """Chords one after another from a: seq of (length in beats, symbol); returns the end time."""
        t = a
        for beats, symbol in seq:
            self.ch.add(t, symbol)
            t += beats * unit
        return t

    def chord(self, t):
        return self.ch.at(t)

    # ---------------------------------------------------------------- players
    def piano(self, t, midis, vel=0.7, hold=0.4, felt=False, gain=0.0, spread=0.0, bus=None, seed=0, role="harmony"):
        bus = self.mix[bus or ("felt" if felt else "keys")]
        for i, m in enumerate(sorted(midis)):
            self.log.append((t + spread * i, hold, int(m), role))
            v = float(np.clip(vel * (0.92 + 0.08 * (i == len(midis) - 1)) + self.rng.normal(0, 0.03), 0.05, 1))
            bus.add(tonal.piano(int(m), q(v), q(hold), felt, (seed + i) % 3), t + spread * i + self.rng.normal(0, 0.0025), gain - 2,
                    tonal.piano_pan(m))

    def comp(self, a, b, pat, low=52, high=76, size=4, vel=0.7, hold=None, felt=False, gain=0.0, bass=False, step=0.125, swing=0.0,
             order=None, seed=0):
        """Piano from a pattern over the changes. Each struck step plays the chord (order=None) or one voice
        of it, in the given order of voice indices (an ostinato), with the bass an octave down on accents."""
        prev = None
        for t, v, k in self.hits(a, b, pat, step, swing, seed=seed):
            name = self.chord(a + k * step + 1e-4)  # the chord on the grid, not where the hand lands
            if not name:
                continue
            vc = voice(name, low, high, prev, size)
            prev = vc
            h = hold if hold is not None else step * 0.9
            if order is None:
                self.piano(t, vc, vel * v, h, felt, gain, 0.006, role="harmony@" + str(round(a + k * step, 4)))
            else:
                idx = order[k % len(order)]
                self.piano(t, [vc[idx % len(vc)] + 12 * (idx // len(vc))], vel * v, h, felt, gain, role="harmony@" + str(round(a + k * step, 4)))
            if bass and v >= 0.95:
                self.piano(t, [bass_note(name, 36, 50)], vel * v * 0.9, max(h, 0.4), felt, gain - 1, role="bass")

    def arp(self, a, b, inst="pluck", kind="pizz", step=0.125, order=(0, 1, 2, 3, 2, 1), low=60, high=84, size=4, vel=0.7, gain=0.0,
            bus="plucks", hold=None, pat=None, seed=0):
        """Broken chords: the voices of each chord in the given order, one per step."""
        prev = None
        p = pat or "x"
        for t, v, k in self.hits(a, b, p, step, seed=seed):
            name = self.chord(a + k * step + 1e-4)
            if not name:
                continue
            vc = voice(name, low, high, prev, size)
            prev = vc
            idx = order[k % len(order)]
            m = vc[idx % len(vc)] + 12 * (idx // len(vc))
            h = hold if hold is not None else step * 1.2
            self.note(inst, kind, t, m, vel * v, h, gain, bus, pan=0.45 * np.sin(k * 0.9), role="harmony")

    def note(self, inst, kind, t, m, vel=0.7, hold=0.3, gain=0.0, bus=None, pan=0.0, role="melody"):
        """One note on any pitched voice."""
        m = int(m)
        if inst != "piano":
            self.log.append((t, hold, m, role))
        if inst == "pluck":
            x, bus = tonal.pluck(m, q(hold), kind, q(vel), int(t * 4) % 3), bus or "plucks"
        elif inst == "mallet":
            x, bus = tonal.mallet(m, kind, q(vel), int(t * 4) % 3), bus or "mallets"
        elif inst == "piano":
            return self.piano(t, [m], vel, hold, kind == "felt", gain, role=role)
        elif inst == "lead":
            x, bus = tonal.lead(m, q(hold, 0.01), kind, q(vel)), bus or "lead"
        elif inst == "bass":
            x, bus = tonal.bass(m, q(hold, 0.01), kind, q(vel), int(t * 4) % 3), bus or "bass"
        else:
            raise ValueError(inst)
        self.mix[bus].add(x, t + self.rng.normal(0, 0.002), gain, pan)

    def bassline(self, a, b, pat, kind="round", octave=0, vel=0.8, gain=0.0, hold=None, step=0.125, swing=0.0, fifths=None, seed=0):
        """The bass under the changes: the root on struck steps; '5' in `fifths` positions plays the fifth,
        'O' the octave above."""
        for t, v, k in self.hits(a, b, pat, step, swing, seed=seed):
            name = self.chord(a + k * step + 1e-4)
            if not name:
                continue
            r = bass_note(name) + 12 * octave
            if fifths:
                c = fifths[k % len(fifths)]
                r = r + 7 if c == "5" else r + 12 if c == "O" else r
            h = hold if hold is not None else step * 0.85
            self.note("bass", kind, t, r, vel * v, h, gain, role="bass")

    def sustain(self, a, b, kind="pad", low=50, high=74, size=4, gain=0.0, vel=0.6, attack=0.6, release=1.2, vowel="a", bright=0.5,
                articulation="legato", seed=0):
        """Held chords over the changes: pad (warm/air/glass), strings, or choir."""
        prev = None
        for s, e, name in self.ch.spans(a, b, end=b):
            vc = voice(name, low, high, prev, size)
            prev = vc
            dur = round(e - s, 3)
            for m_ in vc:
                self.log.append((s, e - s, int(m_), "harmony"))
            if kind in ("warm", "air", "glass", "super"):
                self.mix["pads"].add(tonal.pad(tuple(vc), dur, kind, attack, release, bright, seed), s, gain)
            elif kind == "strings":
                self.mix["strings"].add(tonal.strings(tuple(vc), dur, vel, attack, release, articulation, 5, seed), s, gain)
            elif kind == "choir":
                self.mix["choir"].add(tonal.choir(tuple(vc), dur, vowel, vel, attack, release, 4, seed), s, gain)
            elif kind == "sub":
                n = samples(dur + 0.05)
                f = float(mtof(bass_note(name, 26, 38)))
                self.mix["bass"].add(np.sin(2 * np.pi * f * times(n)) * fade(n, 0.015, 0.05), s, gain - 11)

    def line(self, a, notes, inst="lead", kind="whistle", vel=0.8, gain=0.0, bus=None, unit=BEAT, legato=0.92, transpose=0):
        """A melody: (beat, note, beats[, velocity]) from a."""
        prev = None
        for item in notes:
            beat, nm, beats = item[:3]
            v = item[3] if len(item) > 3 else 1.0
            m = midi(nm) + transpose
            t = a + beat * unit
            h = beats * unit * legato
            self.log.append((t, h, m, "melody"))
            if inst == "lead":
                self.mix[bus or "lead"].add(tonal.lead(m, round(h, 3), kind, round(vel * v, 2), prev if prev is not None and abs(prev - m) <= 4 and kind != "whistle" else None), t, gain)
            else:
                self.note(inst, kind, t, m, vel * v, h, gain, bus, role="melody")
            prev = m

    def strings_hit(self, t, midis, dur=0.25, vel=0.9, gain=0.0, kind="marcato"):
        self.log.extend((t, dur, int(m_), "harmony") for m_ in midis)
        self.mix["strings"].add(tonal.strings(tuple(midis), round(dur, 3), vel, 0.02, 0.4, kind, 5, int(t * 10) % 5), t, gain)

    def brass_hit(self, t, midis, dur=0.3, vel=0.9, gain=0.0, kind="stab"):
        self.log.extend((t, dur, int(m_), "harmony") for m_ in midis)
        self.mix["brass"].add(tonal.brass(tuple(midis), round(dur, 3), vel, kind, int(t * 10) % 5), t, gain)

    # ---------------------------------------------------------------- the end
    def render(self, target=-16.0):
        sfx.design(self.mix, self.pal)
        mix, stems = self.mix.render()
        out, meter = master(mix, target, tilt=self.tilt)
        return out, meter, stems
