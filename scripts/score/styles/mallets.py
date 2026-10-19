"""Claps and mallets: the playful one.

Marimba and kalimba, a plucked ukulele, a whistled hook, and a band of hands: claps, snaps, tambourine,
congas and bongos, with a little swing. Bright and bouncy where the film is busy; a kalimba alone where it
is quiet. C major, lifting to D major for the last words.
"""
from .. import tonal
from ..clock import BEAT, GARDEN, M, WALL
from ..song import Song
from ..theory import midi, notes, voice
from .common import SPECS

# The hook: two beats to a chord (beat, note, beats).
CELL = {
    "C": ((0, "G5", .5), (.5, "E5", .25), (.75, "G5", .5), (1.25, "C6", .5), (1.75, "B5", .25)),
    "G": ((0, "D6", .5), (.5, "B5", .25), (.75, "G5", .5), (1.25, "A5", .75)),
    "Am": ((0, "C6", .25), (.25, "E6", .5), (.75, "D6", .25), (1, "C6", .5), (1.5, "A5", .5)),
    "F": ((0, "A5", .5), (.5, "C6", .25), (.75, "B5", .5), (1.25, "G5", .75)),
}
SWING = 0.1
BOUNCE = "X.xx.xx.X.xx.x.x"        # the marimba's figure in sixteenths
BOUNCE_ORDER = (0, 2, 3, 1, 2, 3, 0, 3, 1, 2)
TUNE_DOWN = 5                      # the residents' tune, from F to C


def compose():
    s = Song("拍手与木琴 · Claps & Mallets", "C4", "major", fader_depth=3.2,
             bell=lambda m, v=0.6: tonal.mallet(int(m), "glock", round(v, 2)),
             pluck=lambda m, v=0.6: tonal.mallet(int(m), "kalimba", round(v, 2)))
    s.mix["lead"].gain = -11.0      # the whistle colours the hook; the marimba carries it
    s.mix["mallets"].gain = -7.0
    s.mix["bass"].gain = 0.0
    s.mix["plucks"].gain = -2.0
    s.mix["pads"].gain = -9.0
    s.mix["perc"].gain = 3.0
    s.tilt = s.tilt + (("peak", 200, 2.0, 0.8), ("peak", 1000, -3.0, 0.9), ("peak", 3000, 2.0, 0.9), ("highshelf", 5000, 3.0, 0.7))
    m = M

    def hook(a, names, vel=0.85, until=None, whistle=False, glock=False, gain=0.0, transpose=0):
        for k, name in enumerate(names):
            for beat, nm, beats in CELL[name]:
                t0 = a + (2 * k + beat) * BEAT
                if until is not None and t0 >= until - 1e-6:
                    return
                n0 = midi(nm) + transpose
                h = beats * BEAT * 0.9
                s.note("mallet", "marimba", t0, n0, vel, h, gain + 2, pan=0.08)
                s.note("pluck", "pizz", t0, n0 - 12, vel * 0.7, min(h, 0.2), gain - 6, pan=-0.15)
                if whistle:
                    s.note("lead", "whistle", t0 + 0.004, n0, vel * 0.85, h, gain - 3)
                if glock:
                    s.note("mallet", "glock", t0, n0 + 12, vel * 0.5, h, gain - 6, pan=0.25)

    def bounce(a, b, vel=0.6, gain=0.0, inst="marimba", low=60, high=79, pat=BOUNCE, swing=SWING):
        prev = None
        for t, v, k in s.hits(a, b, pat, 0.125, swing, seed=11):
            name = s.chord(a + k * 0.125 + 1e-4)
            if not name:
                continue
            vc = voice(name, low, high, prev, 4)
            prev = vc
            n0 = vc[BOUNCE_ORDER[k % len(BOUNCE_ORDER)] % len(vc)]
            s.note("mallet", inst, t, n0, vel * v, 0.2, gain, pan=0.4 * ((k % 3) - 1), role="harmony@" + str(round(a + k * 0.125, 4)))

    def strum(a, b, pat, vel=0.6, gain=0.0, low=55, high=74, swing=SWING):
        """A ukulele strummed: down on the beat, up between, each a quick roll of the chord."""
        prev = None
        for t, v, k in s.hits(a, b, pat, 0.125, swing, seed=13):
            name = s.chord(a + k * 0.125 + 1e-4)
            if not name:
                continue
            vc = voice(name, low, high, prev, 4)
            prev = vc
            order = vc if k % 2 == 0 else vc[::-1]
            for i, n0 in enumerate(order):
                s.note("pluck", "uke", t + 0.012 * i, n0, vel * v * (1 - 0.07 * i), 0.24, gain, pan=0.32,
                       role="harmony@" + str(round(a + k * 0.125, 4)))

    def roll(t, ns, length, vel=0.6, gain=0.0, inst="marimba"):
        """A mallet roll: the notes in turn, thirty-seconds, for `length` seconds, dying away."""
        k, tt = 0, t
        while tt < t + length - 1e-6:
            p = (tt - t) / length
            s.note("mallet", inst, tt, ns[k % len(ns)], vel * (1 - 0.6 * p), 0.12, gain, pan=0.3 * ((k % 2) * 2 - 1))
            k += 1
            tt += 0.0625

    def claps_roll(a, b, g0=-12.0, g1=0.0):
        """Hands building into a downbeat: eighths, then sixteenths, then thirty-seconds."""
        t, k = a, 0
        while t < b - 1e-6:
            p = (t - a) / (b - a)
            s.strike("clap", "", t, 0.6 + 0.4 * p, g0 + (g1 - g0) * p, k)
            t += 0.25 if p < 0.5 else 0.125 if p < 0.8 else 0.0625
            k += 1

    def chorus(a, b, g=0.0, congas=True, hats=True):
        parts = {"kick": "X...x...X...x...", "clap": "....X.......X...", "snare:tight": ("....x.......x...", -7.0),
                 "tamb": "x-x-x-x-x-x-x-x-", "snap": ("..x...x...x...x.", -3.0)}
        if congas:
            parts.update({"conga": ("..x..x....x..x..", -2.0), "congahi": ("x......x.x......", -3.0), "bongo": (".......x.......x", -5.0)})
        if hats:
            parts["ohat"] = ("..x...x...x...x.", -8.0)
        s.groove(a, b, parts, g, swing=SWING)
        s.bassline(a, b, "X..x..x.X..x..x.", "finger", vel=0.85, gain=g, swing=SWING)

    def verse(a, b, g=0.0):
        s.groove(a, b, {"kick": "X.....x.X.......", "snap": "....x.......x...", "shaker": "xoxoxoxoxoxoxoxo", "conga": ("......x.......x.", -4.0)}, g - 1, swing=SWING)
        s.bassline(a, b, "x..x....x..x..x.", "finger", vel=0.75, gain=g - 1, swing=SWING)

    # ---------------------------------------------------------------- once upon a time: a kalimba
    s.changes(0.0, [(4, "Cadd9"), (4, "Fmaj7")])
    s.sustain(0.5, m["press1"], "air", 60, 79, 3, -6, attack=2.0, release=1.2, bright=0.35)
    s.note("mallet", "kalimba", 0.0, midi("C4"), 0.55, 1.5, 0)
    s.note("mallet", "kalimba", 2.0, midi("F3"), 0.55, 1.5, 0)
    for beat, nm, beats, v in ((1, "G5", .5, .5), (1.5, "C6", .5, .55), (2, "E6", 1, .6), (3, "D6", .5, .5), (3.5, "C6", .5, .5),
                               (5, "A5", .5, .5), (5.5, "C6", .5, .55), (6, "F6", 1, .62), (7, "E6", .5, .55), (7.5, "G6", .5, .5)):
        s.note("mallet", "kalimba", beat * BEAT, midi(nm), v, beats * BEAT, 2, pan=0.15)
    for i, t0 in enumerate((m["draw0"], m["draw0"] + 0.75, m["draw1"], m["draw1"] + 0.5)):
        s.strike("snap", "", t0, 0.45, -8, i)
    claps_roll(m["press1"] - 0.75, m["press1"], -20, -12)

    # ---------------------------------------------------------------- the Home button
    P1, P2 = m["press1"], m["press2"]
    s.changes(P1, [(4, "Fmaj7"), (2, "G")])
    s.impact(P1, 0.4, -7, crash=False)
    bounce(P1, P2, 0.45, -3, "kalimba", 64, 84)
    s.groove(P1, P2, {"kick:soft": "X.......x.......", "shaker": ("..x...x...x...x.", -4.0)}, swing=SWING)
    s.sustain(P1, P2, "sub", gain=-6)
    s.note("mallet", "marimba", m["home"] + 0.5, midi("G5"), 0.6, 0.4, 0)
    s.note("mallet", "marimba", m["home"] + 0.625, midi("C6"), 0.62, 0.4, 0)
    s.note("mallet", "marimba", m["home"] + 0.75, midi("E6"), 0.65, 0.6, 0)
    for i, nn in enumerate(notes("C5 E5 G5 A5 C6 E6 G6 A6 C7 E7")):  # a bead of light runs the arc
        s.note("mallet", "glock", m["home"] + 1.0 + 0.125 * i, nn, 0.4 + 0.03 * i, 0.4, -6, pan=-0.6 + 0.13 * i)
    claps_roll(P2 - 0.5, P2, -18, -8)

    # ---------------------------------------------------------------- the build
    s.changes(P2, [(4, "Am"), (2, "F"), (2, "G"), (2, "Gsus4")])
    s.impact(P2, 0.7, -3)
    bounce(P2, m["flash"], 0.6, -1)
    s.groove(P2, m["flash"] - 0.5, {"kick": "X...x...X...x..."}, -3)
    s.groove(P2 + 2.0, m["flash"] - 0.5, {"clap": "....X.......X...", "tamb": "x-x-x-x-x-x-x-x-", "conga": ("..x..x....x..x..", -4.0)}, -3, swing=SWING)
    s.bassline(P2 + 2.0, m["flash"] - 0.25, "x.x.x.x.x.x.x.x.", "finger", vel=0.7, gain=-2)
    s.arp(P2 + 1.0, m["flash"], "pluck", "pizz", 0.125, (0, 1, 2, 3, 2, 1), 60, 84, 4, 0.55, -4)
    s.rise(m["morph"], m["flash"], -2, seed=1)
    claps_roll(m["flash"] - 2.0, m["flash"], -14, 0)
    s.swell_into(m["flash"], 1.2, -2)

    # ---------------------------------------------------------------- a place: the hook
    F0 = m["flash"]
    s.changes(F0, [(2, "C"), (2, "G"), (2, "Am"), (2, "F")])
    s.impact(F0, 1.3)
    chorus(F0, m["bench"])
    hook(F0, ["C", "G", "Am", "F"], 0.9, whistle=True, glock=True)
    strum(F0, m["bench"], "x.x.x.xx.xx.x.x.", 0.55, -2)
    bounce(F0, m["bench"], 0.5, -6, "kalimba", 67, 88)
    s.sustain(F0, m["bench"], "glass", 60, 79, 4, -6, attack=0.2, release=0.6, bright=0.6)

    # ---------------------------------------------------------------- the workbench
    B0 = m["bench"]
    s.changes(B0, [(4, "Am"), (4, "Fmaj7"), (3, "C"), (2, "G")])
    verse(B0, m["implode"] - 0.5)
    bounce(B0, m["implode"] - 0.25, 0.5, -3, "kalimba", 64, 84)
    strum(B0, m["implode"] - 0.5, "..x...x...x...x.", 0.45, -5)
    for i, ch in enumerate(("C5 E5 A5", "E5 A5 C6", "A5 C6 E6", "C6 E6 A6")):  # four layers part
        t0 = m["explode"] + 0.5 + 0.25 * i
        for n0 in notes(ch):
            s.note("mallet", "marimba", t0, n0, 0.75 + 0.05 * i, 0.3, -1)
        s.strike("bongo", "", t0, 0.9, 0, i)
        s.strike("clap", "", t0, 0.7, -6, i)
    s.kick(m["implode"] + 0.9, "pop", 0.85, -3)
    s.strike("congahi", "", m["implode"] + 0.9, 0.9, -2, 0, "slap")

    # ---------------------------------------------------------------- the launch pad
    L0 = m["launch"]
    s.changes(L0, [(4, "Am"), (2, "F"), (1, "G")])
    bounce(L0, m["fly"], 0.4, -4, "kalimba", 64, 84, pat="x.x.x.x.x.x.x.x.")
    s.groove(L0, m["warp"], {"shaker": "x-x-x-x-x-x-x-x-", "kick:soft": "X.......X......."}, -3, swing=SWING)
    s.sustain(L0, m["warp"], "sub", gain=-5)
    for i, nn in enumerate(notes("A5 C6 E6 G6 A6 C7 E7 G7 A7")):  # the glock follows the light in flight
        s.note("mallet", "glock", m["fly"] + 0.03 + i * 0.045, nn, 0.45 + 0.04 * i, 0.2, -5)
    s.groove(m["fly"], m["warp"], {"kick": "X.x.X.x.X.x.X.x."}, -4)
    claps_roll(m["warp"], m["slit"], -16, -6)
    s.rise(m["warp"] - 0.05, m["slit"], -3, 500, 11000, seed=2)

    # ---------------------------------------------------------------- the narrow way; the door
    S0, O0 = m["slit"], m["open"]
    s.changes(S0, [(2, "Am9")])
    s.note("mallet", "kalimba", S0, midi("E6"), 0.5, 0.9, 1)
    s.note("mallet", "kalimba", S0 + 0.5, midi("B5"), 0.45, 0.6, 1)
    s.kick(S0, "soft", 0.6, -6)
    s.sustain(S0, O0, "air", 64, 83, 3, -8, attack=0.4, release=0.4, bright=0.6)
    s.swell_into(O0, 0.9, 0)
    s.changes(O0, [(4, "Am9"), (2, "F")])
    s.impact(O0, 0.95)
    for i, nn in enumerate(notes("A4 B4 C5 E5 G5 A5 B5 C6 E6 G6 A6 B6")):  # every colour, up the bars
        s.note("mallet", "marimba", O0 + 0.03 * i, nn, 0.7, 0.4, -2, pan=-0.8 + 0.145 * i)
    s.groove(O0, m["rise"] - 0.5, {"kick": "X...x...X...x...", "clap": "....x.......x...", "shaker": "-o-o-o-o-o-o-o-o", "conga": ("..x..x....x..x..", -4.0)}, -1, swing=SWING)
    s.arp(O0, m["rise"], "pluck", "pizz", 0.125, (0, 1, 2, 3, 2, 3, 1, 2), 62, 86, 4, 0.65, -3)
    s.bassline(O0, m["rise"], "x.x.x.x.x.x.x.x.", "finger", vel=0.8)
    bounce(O0, m["rise"], 0.55, -3)
    claps_roll(m["rise"] - 0.5, m["rise"], -14, -4)

    # ---------------------------------------------------------------- the wave
    R0, J0 = m["rise"], m["jump"]
    s.changes(R0, [(2, "Fmaj7"), (2, "G")])
    s.impact(R0, 0.85)
    for n0 in notes("E5 A5 C6 F6"):
        s.note("mallet", "marimba", R0, n0, 0.85, 0.4, 0)
    t = R0 + 1.0
    while t < J0 - 0.125 - 1e-6:  # the kick doubles, then doubles again
        s.kick(t, "pop", 0.9, -2)
        t += 0.25 if t < J0 - 0.5 else 0.125
    bounce(R0, J0 - 0.125, 0.7, -1, pat="xxxxxxxxxxxxxxxx", swing=0.0)
    s.bassline(R0, J0 - 0.125, "x.x.x.x.x.x.x.x.", "finger", vel=0.85)
    claps_roll(R0 + 0.5, J0 - 0.125, -12, 2)
    s.rise(R0 + 0.3, J0, -1, 300, 12000, seed=4)
    s.swell_into(J0, 1.0, 1)

    # ---------------------------------------------------------------- out into the world: the hook, biggest
    s.changes(J0, [(2, "Am"), (2, "F"), (2, "C"), (2, "G")])
    s.impact(J0, 1.7, 1)
    chorus(J0, m["back"] - 0.5, 1)
    hook(J0, ["Am", "F", "C", "G"], 0.95, whistle=True, glock=True, gain=1)
    strum(J0, m["back"] - 0.25, "x.x.x.xx.xx.x.x.", 0.6, -1)
    bounce(J0, m["back"], 0.55, -5, "kalimba", 67, 88)
    s.sustain(J0, m["back"], "glass", 60, 81, 4, -4, attack=0.2, release=0.5, bright=0.7)
    s.sustain(J0, m["back"], "choir", 64, 81, 3, -10, 0.6, attack=0.3, release=0.5, vowel="a")
    for i in range(4):  # out of the tunnel
        s.strike("congahi", "", m["back"] - 0.5 + 0.125 * i, 0.95, 0, i, "slap" if i % 2 else "open")

    # ---------------------------------------------------------------- the stage: hush, then the build to the lights
    K0 = m["back"]
    s.changes(K0, [(4, "Am"), (4, "Fmaj7"), (4, "C"), (2, "G")])
    bounce(K0, m["show"], 0.4, -5, "kalimba", 64, 84, pat="x.o.x.o.x.o.x.o.")
    s.groove(K0 + 2.0, m["lasers"], {"snap": "....x.......x...", "kick:soft": "X.......X......."}, -2, swing=SWING)
    for i, b0 in enumerate((m["burst"], m["burst"] + 0.35, m["burst"] + 0.7)):  # the light fires: marimba, hands
        for n0 in (notes("E6 A6") if i < 2 else notes("A6 C7")):
            s.note("mallet", "marimba", b0, n0, 0.65 + 0.06 * i, 0.3, -1)
        s.strike("clap", "", b0, 0.7, -5, i)
    s.bassline(m["sheet"], m["show"] - 0.25, "x..x..x.x..x..x.", "finger", vel=0.75, swing=SWING)
    s.groove(m["sheet"], m["lasers"], {"shaker": "xoxoxoxoxoxoxoxo"}, -2, swing=SWING)
    s.groove(m["lasers"], m["show"] - 0.5, {"kick": "X...x...X...x...", "clap": "....x.......x...", "tamb": "x-x-x-x-x-x-x-x-", "conga": ("..x..x....x..x..", -4.0)}, -2, swing=SWING)
    s.arp(m["lasers"], m["show"], "pluck", "pizz", 0.125, (0, 1, 2, 3, 2, 1), 64, 86, 4, 0.6, -3)
    claps_roll(m["show"] - 1.0, m["show"], -16, -2)
    s.rise(m["show"] - 1.5, m["show"], -4, seed=5)
    s.swell_into(m["show"], 0.6, -2)

    # ---------------------------------------------------------------- the lights come up
    H0 = m["show"]
    s.changes(H0, [(2, "C"), (2, "G"), (2, "F")])
    s.impact(H0, 0.8, -1)
    chorus(H0, m["console"])
    hook(H0, ["C", "G", "F"], 0.88, whistle=True)
    strum(H0, m["console"], "x.x.x.xx.xx.x.x.", 0.55, -2)

    # ---------------------------------------------------------------- the console: six dials, a note each
    C0 = m["console"]
    s.changes(C0, [(4, "F"), (4, "C"), (4, "G")])
    verse(C0, m["pillars"] - 1.0)
    strum(C0, m["pillars"] - 0.5, "..x...x...x...x.", 0.45, -5)
    s.sustain(C0, m["pillars"], "warm", 52, 72, 4, -6)
    penta = notes("C6 D6 E6 G6 A6 C7 D7 E7 G7")
    for i, end in enumerate((84, 22, 74, 92, 72, 96)):  # each dial lands on a note as high as its value
        s.note("mallet", "marimba", m["knobs"] + 0.5 * i + 0.85, penta[min(8, int(end / 100 * 9))], 0.75, 0.4, 0, pan=-0.4)
        s.strike("congahi", "", m["knobs"] + 0.5 * i + 0.85, 0.6, -6, i)
    claps_roll(m["pillars"] - 1.0, m["pillars"], -16, -2)
    s.swell_into(m["pillars"], 1.0, -1)

    # ---------------------------------------------------------------- four places, one line, one point
    s.changes(m["pillars"], [(1, "Am"), (1, "F"), (1, "C"), (3, "G")])
    for k, ch in enumerate(("A4 C5 E5 A5", "A4 C5 F5 A5", "G4 C5 E5 G5", "G4 B4 D5 G5")):
        t0 = m["pillars"] + 0.5 * k
        s.impact(t0, 0.6 + 0.15 * k, -3, crash=k == 0)
        roll(t0, notes(ch), 0.42, 0.85, -1)
        s.note("bass", "finger", t0, midi(("A2", "F2", "C3", "G2")[k]), 0.9, 0.4, 0)
        s.strike("clap", "", t0, 0.95, -1, k)
        s.strike("conga", "", t0, 0.95, -1, k, "slap")
    s.groove(m["pillars"] + 2.0, m["converge"], {"kick": "X.......X.......", "clap": "........X......."}, -2)
    s.sustain(m["pillars"] + 2.0, m["converge"], "sub", gain=-4)
    s.changes(m["converge"], [(2, "F"), (3, "Gsus4"), (2, "G")])
    bounce(m["converge"], m["lock"] - 0.125, 0.55, -3)
    s.rise(m["converge"], m["point"], -5, seed=6)
    s.kick(m["point"], "pop", 1.0, -1)
    s.groove(m["point"], m["lock"] - 1.0, {"kick": "X...x...X...x...", "clap": "....x.......x...", "tamb": "x-x-x-x-x-x-x-x-"}, -1, swing=SWING)
    s.bassline(m["point"], m["lock"] - 0.125, "x.x.x.x.x.x.x.x.", "finger", vel=0.85)
    t = m["lock"] - 1.0
    while t < m["lock"] - 0.125 - 1e-6:
        s.kick(t, "pop", 0.95, -1)
        t += 0.25 if t < m["lock"] - 0.5 else 0.125
    claps_roll(m["lock"] - 1.5, m["lock"] - 0.125, -12, 2)
    s.rise(m["point"], m["lock"], -1, 260, 12000, seed=7)
    s.swell_into(m["lock"], 1.0, 1)

    # ---------------------------------------------------------------- the name
    Z0 = m["lock"]
    s.changes(Z0, [(2, "C"), (2, "G"), (2, "Am"), (1, "F")])
    s.impact(Z0, 1.8, 2)
    chorus(Z0, m["dark"], 1)
    hook(Z0, ["C", "G", "Am", "F"], 0.95, until=m["dark"], whistle=True, glock=True, gain=1)
    strum(Z0, m["dark"], "x.x.x.xx.xx.x.x.", 0.6, -1)
    bounce(Z0, m["dark"], 0.55, -5, "kalimba", 67, 88)
    s.sustain(Z0, m["dark"], "glass", 60, 81, 4, -4, attack=0.2, release=0.3, bright=0.7)
    s.sustain(Z0, m["dark"], "choir", 64, 81, 3, -9, 0.65, attack=0.2, release=0.3, vowel="a")

    # ---------------------------------------------------------------- the residents
    U0 = m["cut"]
    s.changes(U0, [(4, "C")])
    s.note("mallet", "kalimba", U0, midi("C4"), 0.5, 1.5, 0)
    s.note("mallet", "kalimba", U0, midi("G4"), 0.45, 1.5, 0)
    s.note("mallet", "kalimba", U0 + 1.0, midi("E5"), 0.45, 1.0, 1)
    s.groove(U0, m["swarm"], {"kick:soft": "X.......X.......", "snap": ("....o.......o...", -2.0)}, -6, swing=SWING)
    S1 = m["swarm"]
    s.changes(S1, [(4, "C"), (4, "Am"), (4, "F"), (4, "G"), (4, "C"), (4, "G")])
    from .fusion import TUNE
    for beat, nm, beats in TUNE:  # the residents' tune: kalimba, a pizzicato an octave down
        s.note("mallet", "kalimba", S1 + beat * BEAT, midi(nm) - TUNE_DOWN, 0.75, beats * BEAT, 1, pan=0.12)
        s.note("pluck", "pizz", S1 + beat * BEAT, midi(nm) - TUNE_DOWN - 12, 0.55, 0.25, -6, pan=-0.12)
    s.groove(S1, GARDEN - 1.0, {"kick": "X.....x.X.......", "clap": ("....x.......x...", -3.0), "shaker": "xoxoxoxoxoxoxoxo",
                                "conga": ("..x..x....x..x..", -4.0), "bongo": (".......x.......x", -6.0)}, -2, swing=0.14)
    s.bassline(S1, GARDEN - 0.5, "x..x..x.x.....x.", "finger", vel=0.75, swing=0.14)
    strum(S1, GARDEN - 0.5, "..x...x...x...x.", 0.4, -6, swing=0.14)

    # ---------------------------------------------------------------- the back garden
    s.changes(GARDEN, [(4, "Fmaj7"), (2, "C"), (2, "G")])
    bounce(GARDEN, m["device"] - 1.0, 0.5, -1, "kalimba", 64, 84, pat="x.o.x.o.x.o.x.o.")
    s.sustain(GARDEN, m["device"], "air", 57, 76, 4, -8, attack=1.2, release=0.6, bright=0.4)
    for beat, nm, beats in ((0, "C6", 1.5), (1.5, "A5", .5), (2, "G5", 1), (3, "E5", 1), (4, "G5", 1), (5, "E5", 1)):
        s.note("mallet", "vibes", GARDEN + beat * BEAT, midi(nm), 0.6, beats * BEAT, 3, pan=0.1)
    claps_roll(m["device"] - 1.0, m["device"], -20, -4)
    s.rise(m["device"] - 1.2, m["device"], -4, seed=8)
    s.swell_into(m["device"], 1.0, -1)

    # ---------------------------------------------------------------- made for one screen
    D0 = m["device"]
    s.changes(D0, [(4, "Am"), (4, "Fmaj7"), (2, "C"), (2, "G"), (2, "Am"), (2, "F")])
    s.impact(D0, 1.2)
    chorus(D0, m["walls"] - 0.25)
    bounce(D0, D0 + 4.0, 0.6, -2)
    strum(D0, m["walls"] - 0.25, "x.x.x.xx.xx.x.x.", 0.55, -3)
    for i, t0 in enumerate(SPECS):  # the numbers slam down
        s.impact(t0, 0.5, -6, crash=False)
        for n0 in (notes("E6 A6 C7") if i % 2 else notes("C6 E6 A6")):
            s.note("mallet", "marimba", t0, n0, 0.85, 0.3, -1)
        s.strike("conga", "", t0, 0.95, 0, i, "slap")
    hook(D0 + 4.0, ["C", "G", "Am", "F"], 0.88, whistle=True)

    # ---------------------------------------------------------------- three wallpapers
    W0 = m["walls"]
    s.changes(W0, [(2, "C"), (2, "G/B"), (2, "Am")])
    for i, t0 in enumerate(WALL["calls"]):
        s.impact(t0, 0.75 + 0.1 * i, -2, crash=i == 0)
        for n0 in notes(("E5 G5 C6", "D5 G5 B5", "C5 E5 A5")[i]):
            s.note("mallet", "marimba", t0, n0 + 12, 0.88, 0.35, 0)
        for j, nn in enumerate(("G5 C6 E6", "G5 B5 D6", "E5 A5 C6")[i].split()):  # a flourish into each
            s.note("mallet", "glock", t0 - 0.1875 + 0.0625 * j, midi(nn) + 12, 0.5, 0.1, -6)
        s.strike("congahi", "", t0, 0.9, -1, i, "slap")
    chorus(W0, WALL["float"], 0, hats=False)
    bounce(W0, WALL["float"], 0.6, -2)

    # glass in the air: half-time, the kalimba turning over like light on glass
    G0, G1 = WALL["float"], W0 + 5.5
    s.changes(G0, [(2, "Fmaj7"), (2, "Dm9"), (1, "Gsus4")])
    s.impact(G0, 0.4, -10, crash=False)
    s.arp(G0 + 0.25, G1, "mallet", "kalimba", 0.125, (0, 2, 1, 3, 2, 4, 3, 1), 72, 93, 4, 0.5, -1, "mallets")
    s.groove(G0, G1, {"kick:soft": "X.......X.......", "snap": "........X.......", "shaker": ("xoxoxoxoxoxoxoxo", -4.0)}, -3, swing=SWING)
    s.sustain(G0, G1, "air", 62, 81, 3, -6, attack=0.6, release=0.5, bright=0.7)
    s.sustain(G0, G1, "sub", gain=-7)

    # the device rises; the cards land; the picker; a tap
    s.changes(G1, [(2, "G"), (3, "C"), (0.5, "C")])
    s.rise(G1 - 0.6, WALL["risen"], -10, 200, 4000, seed=12)
    for i, t0 in enumerate(WALL["land"]):
        s.note("mallet", "marimba", t0, midi(("G5", "B5", "C6")[i]), 0.7, 0.4, 0)
    s.kick(WALL["risen"], "soft", 0.8, -4)
    bounce(WALL["land"][2], WALL["open"], 0.4, -5, "kalimba", 64, 84, pat="x...o...x...o...")
    s.groove(WALL["land"][2], WALL["open"], {"snap": "....x.......x...", "shaker": ("xoxoxoxoxoxoxoxo", -5.0)}, -4, swing=SWING)
    s.sustain(G1, WALL["open"], "warm", 52, 72, 4, -8, attack=0.5)
    s.note("mallet", "glock", WALL["pick"], midi("C6"), 0.55, 0.6, -3)
    s.note("mallet", "glock", WALL["pick"], midi("G6"), 0.5, 0.6, -3)

    # chosen: it opens, and night falls
    s.changes(WALL["open"], [(3, "Dm9")])
    s.impact(WALL["open"], 0.5, -8, crash=False)
    s.sustain(WALL["open"], m["tag"], "warm", 50, 74, 5, -4, attack=0.25, release=1.0)
    for n0 in notes("D4 A4 E5 F5 C6"):
        s.note("mallet", "vibes", WALL["open"], n0, 0.55, 1.4, -1)
    s.note("mallet", "kalimba", WALL["fall"], midi("E6"), 0.42, 0.8, 0)
    s.note("mallet", "kalimba", WALL["fall"] + 0.375, midi("A5"), 0.38, 0.8, 0)

    # ---------------------------------------------------------------- launch from here; the lift to D major
    T0, F2 = m["tag"], m["flash2"]
    s.changes(T0, [(2, "F"), (2, "A")])
    bounce(T0, F2 - 0.125, 0.65, -1, pat="xxxxxxxxxxxxxxxx", swing=0.0)
    t = T0 + 1.0
    while t < F2 - 0.125 - 1e-6:
        s.kick(t, "pop", 0.9, -2)
        t += 0.25 if t < F2 - 0.5 else 0.125
    s.bassline(T0, F2 - 0.125, "x.x.x.x.x.x.x.x.", "finger", vel=0.8)
    claps_roll(T0, F2 - 0.125, -18, 2)
    s.rise(T0 + 0.4, F2, -1, 300, 12000, seed=9)
    s.swell_into(F2, 1.0, 1)

    s.changes(F2, [(2, "D"), (2, "A"), (2, "Bm"), (2, "G")])
    s.impact(F2, 1.9, 2)
    chorus(F2, F2 + 4.0, 1)
    hook(F2, ["C", "G", "Am", "F"], 0.95, whistle=True, glock=True, gain=1, transpose=2)
    strum(F2, F2 + 4.0, "x.x.x.xx.xx.x.x.", 0.6, -1)
    bounce(F2, F2 + 4.0, 0.55, -5, "kalimba", 69, 90)
    s.sustain(F2, F2 + 4.0, "glass", 62, 81, 4, -4, attack=0.2, release=0.5, bright=0.7)
    s.sustain(F2, F2 + 4.0, "choir", 64, 81, 3, -9, 0.65, attack=0.2, release=0.5, vowel="a")

    end = F2 + 4.0
    s.changes(end, [(8, "Dadd9")])
    s.impact(end, 1.3)
    roll(end, notes("D5 F#5 A5 E6"), 1.6, 0.8, 0)
    s.note("bass", "finger", end, midi("D2"), 0.9, 1.6, 0)
    s.note("mallet", "kalimba", end, midi("D4"), 0.7, 2.0, 0)
    s.sustain(end, m["end"], "glass", 62, 81, 4, -5, attack=0.05, release=1.2, bright=0.6)
    s.sustain(end, m["end"], "sub", gain=-4)
    s.strike("clap", "", end, 1.0, 0, 0)
    s.strike("conga", "", end, 1.0, 0, 0, "slap")
    for i, nn in enumerate(notes("D6 F#6 A6 D7")):
        s.note("mallet", "glock", end + 0.25 * i, nn, 0.55, 1.0, -4, pan=-0.3 + 0.2 * i)
    s.strike("snap", "", m["end"] - 0.4, 0.8, -2, 1)
    return s
