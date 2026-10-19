"""Fusion: our launch score, played by a piano that drives it.

The harmony, the hook and the arc of the film's own score, carried by a piano ostinato in 3 + 3 + 2 (the
kind of quick, bright piano a product film is cut to), with claps, tambourine and snaps instead of a
drum machine's hats, a warm bass, strings and voices for the big moments, and a lift to D major at the end.
Quiet where the film is quiet: a felt piano alone at the start, in the garden, under the night.
"""
from .. import kit, tonal
from ..clock import BEAT, GARDEN, M, WALL
from ..song import Song
from ..theory import midi, notes

# The hook: a cell of two beats to a chord (beat, note, beats).
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
PRESTO = "XooXooXoXooXooXo"          # sixteenths, accents in 3 + 3 + 2
PRESTO_ORDER = (0, 1, 2, 0, 1, 2, 0, 1)
TUNE = [(0, "A5", .5), (.5, "C6", .5), (1, "F6", 1), (2, "E6", .5), (2.5, "C6", .5), (3, "A5", .5), (3.5, "C6", .5),
        (4, "D6", .5), (4.5, "F6", .5), (5, "A6", 1), (6, "G6", .5), (6.5, "F6", .5), (7, "D6", 1),
        (8, "F6", .5), (8.5, "D6", .5), (9, "Bb5", 1), (10, "C6", .5), (10.5, "D6", .5), (11, "F6", 1),
        (12, "E6", .5), (12.5, "G6", .5), (13, "C7", 1), (14, "Bb6", .5), (14.5, "G6", .5), (15, "E6", .5), (15.5, "C6", .5),
        (16, "F6", .5), (16.5, "A6", .5), (17, "C7", 1), (18, "A6", .5), (18.5, "F6", .5), (19, "C6", 1),
        (20, "E6", .5), (20.5, "G6", .5), (21, "E6", .5), (21.5, "C6", .5), (22, "D6", 1), (23, "E6", 1)]


def compose():
    s = Song("融合 · Fusion", "F4", "major", fader_depth=3.0,
             bell=lambda m, v=0.6: tonal.mallet(int(m), "glock", round(v, 2)),
             pluck=lambda m, v=0.6: tonal.mallet(int(m), "celesta", round(v, 2)))
    s.tilt = s.tilt + (("peak", 300, 1.5, 0.7), ("peak", 3500, 1.5, 0.8))
    m = M

    def hook(a, names, vel=0.8, until=None, strings=False, glock=True, gain=0.0, transpose=0):
        for k, name in enumerate(names):
            for beat, nm, beats in CELL[name]:
                t0 = a + (2 * k + beat) * BEAT
                if until is not None and t0 >= until - 1e-6:
                    return
                n0 = midi(nm) + transpose
                h = beats * BEAT * 0.92
                s.piano(t0, [n0, n0 - 12], vel, h, gain=gain + 1, role="melody")
                if glock:
                    s.note("mallet", "glock", t0, n0 + 12, vel * 0.55, h, gain - 7)
                if strings:
                    s.mix["strings"].add(tonal.strings((n0, n0 - 12), round(h + 0.05, 3), 0.85, 0.03, 0.25, "marcato", 4, int(t0 * 8) % 5), t0, gain - 1)

    def presto(a, b, vel=0.7, low=60, high=79, gain=0.0, lh=True, step=0.125, pat=PRESTO):
        s.comp(a, b, pat, low, high, 3, vel, step * 0.95, gain=gain, order=PRESTO_ORDER, step=step)
        if lh:
            s.comp(a, b, "X.......x.......", 36, 52, 2, vel * 0.85, 0.45, gain=gain - 1)

    def chorus_drums(a, b, g=0.0, hats=True):
        parts = {"kick": "X...x...X...x...", "clap": "....X.......X...", "tamb": "x-x-x-x-x-x-x-x-"}
        if hats:
            parts["ohat"] = ("..x...x...x...x.", -4.0)
        s.groove(a, b, parts, g)

    # ---------------------------------------------------------------- once upon a time
    s.changes(0.0, [(4, "Dm9"), (4, "Bbmaj7")])
    s.sustain(0.4, m["press1"], "air", 57, 76, 4, -10, attack=2.0, release=1.5, bright=0.3)
    for beat, nm, beats, v in ((1, "A4", 1, .45), (2, "D5", 1, .5), (3, "F5", .5, .5), (3.5, "E5", .5, .45),
                               (5, "D5", 1, .5), (6, "F5", .5, .55), (6.5, "A5", .5, .6), (7, "C6", 1, .55)):
        s.piano(beat * BEAT, [midi(nm)], v, beats * BEAT * 1.6, felt=True, gain=2, role="melody")
    s.piano(0.0, [midi("D3"), midi("A3")], 0.5, 1.9, felt=True)
    s.piano(2.0, [midi("Bb2"), midi("F3")], 0.5, 1.9, felt=True)
    s.comp(m["draw0"] - 0.1, m["press1"], "x-x-x-x-", 62, 77, 3, 0.4, 0.2, felt=True, gain=-4, order=(2, 1, 0, 1), step=0.25)
    s.fill(m["press1"] - 0.75, m["press1"], "snare", -24, -14)
    s.swell_into(m["press1"], 0.8, -6)

    # ---------------------------------------------------------------- the Home button
    P1, P2 = m["press1"], m["press2"]
    s.changes(P1, [(4, "Bbmaj7"), (2, "C")])
    s.impact(P1, 0.45, -6, crash=False)
    s.comp(P1, P2, "x-o-x-o-x-o-x-o-", 60, 76, 3, 0.5, 0.2, felt=True, order=(0, 1, 2, 1), gain=-1)
    s.sustain(P1, P2, "sub", gain=-6)
    s.groove(P1, P2, {"kick:soft": "X.......x.......", "shaker": ("..x...x...x...x.", -6.0)})
    s.piano(m["home"] + 0.5, notes("A5 D6 F6"), 0.55, 0.9, gain=-2, role="melody")  # the name appears
    for i in range(10):  # a bead of light runs the length of the arc
        tb = m["home"] + 1.0 + 0.125 * i
        s.note("mallet", "celesta", tb, notes("F5 A5 C6 D6 F6 A6 C7 D7 F7 A7")[i], 0.45 + 0.03 * i, 0.4, -6, pan=-0.6 + 0.13 * i)
    s.fill(P2 - 0.5, P2, "snare", -20, -10)

    # ---------------------------------------------------------------- pressed again: the build to the flash
    s.changes(P2, [(4, "Dm"), (2, "Bb"), (2, "C"), (2, "Csus4")])
    s.impact(P2, 0.8, -3)
    presto(P2, m["flash"], 0.62, gain=-1)
    s.groove(P2, m["flash"] - 0.5, {"kick": "X...x...X...x..."}, -2)
    s.groove(P2 + 2.0, m["flash"] - 0.5, {"clap": "....X.......X...", "tamb": "x-x-x-x-x-x-x-x-"}, -3)
    s.bassline(P2 + 2.0, m["flash"] - 0.25, "x.x.x.x.x.x.x.x.", "round", vel=0.7, gain=-2)
    s.sustain(P2, m["flash"], "strings", 50, 74, 4, -3, 0.6, attack=1.5, release=0.6)
    s.rise(m["morph"], m["flash"], -1, seed=1)
    s.fill(m["flash"] - 2.0, m["flash"], "snare", -16, 0)
    s.swell_into(m["flash"], 1.2)

    # ---------------------------------------------------------------- a flash: a place
    F0 = m["flash"]
    s.changes(F0, [(2, "F"), (2, "C"), (2, "Dm"), (2, "Bb")])
    s.impact(F0, 1.4)
    chorus_drums(F0, m["bench"])
    s.bassline(F0, m["bench"], "X.x.x.x.X.x.x.x.", "round", vel=0.85, fifths="R.O.R.O.R.O.R.O.")
    presto(F0, m["bench"], 0.78)
    hook(F0, ["F", "C", "Dm", "Bb"], 0.85, strings=True)
    s.sustain(F0, m["bench"], "strings", 50, 74, 4, -6, 0.75, attack=0.3, release=0.6)
    s.sustain(F0, m["bench"], "choir", 62, 79, 3, -8, 0.6, attack=0.3, release=0.8, vowel="a")

    # ---------------------------------------------------------------- the workbench
    B0 = m["bench"]
    s.changes(B0, [(4, "Dm"), (4, "Bbmaj7"), (3, "F"), (2, "C")])
    s.groove(B0, m["implode"] - 0.5, {"kick": "X......xX.....x.", "snap": "....x.......x...", "shaker": "xoxoxoxoxoxoxoxo"})
    s.bassline(B0, m["implode"], "x..x..x.x..x..x.", "finger", vel=0.8, gain=1)
    s.comp(B0, m["implode"] - 0.25, ".x.x.x.x.x.x.x.x", 58, 74, 3, 0.55, 0.11)
    s.sustain(B0, m["launch"], "warm", 50, 70, 4, -8, attack=0.8)
    E0 = m["explode"]
    for i, ch in enumerate((notes("F5 A5 D6"), notes("A5 D6 F6"), notes("D6 F6 A6"), notes("F6 A6 D7"))):  # four layers part
        t0 = E0 + 0.5 + 0.25 * i
        s.piano(t0, ch, 0.7 + 0.05 * i, 0.2, gain=-1)
        s.strike("tom", "", t0, 0.85, -2, i, 98 + 22 * i)
    s.reverse(kit.cymbal("crash", 1.2, 4), m["implode"] + 0.9, "drums", -14)
    s.kick(m["implode"] + 0.9, "pop", 0.9, -2)

    # ---------------------------------------------------------------- the launch pad
    L0 = m["launch"]
    s.changes(L0, [(4, "Dm"), (2, "Bb"), (1, "C")])
    s.comp(L0, m["fly"], "x...x...x...x...", 57, 74, 4, 0.5, 0.18, gain=-1)
    s.groove(L0, m["warp"], {"hat": "x.x.x.x.x.x.x.x.", "kick:soft": "X.......X......."}, -3)
    s.sustain(L0, m["warp"], "sub", gain=-4)
    run = notes("D5 F5 A5 C6 D6 F6 A6 C7 D7")
    for i, nn in enumerate(run):  # the piano follows the light in flight
        s.piano(m["fly"] + 0.03 + i * 0.045, [nn], 0.5 + 0.05 * i, 0.12, gain=-2, role="melody")
    s.groove(m["fly"], m["warp"], {"kick": "X.x.X.x.X.x.X.x."}, -3)
    s.fill(m["warp"], m["slit"], "snare", -18, -6, kicks=True)
    s.rise(m["warp"] - 0.05, m["slit"], -2, 500, 11000, seed=2)

    # ---------------------------------------------------------------- the narrow way, then a door edged in every colour
    S0, O0 = m["slit"], m["open"]
    s.changes(S0, [(2, "Dm9")])
    s.piano(S0, [midi("A5")], 0.45, 0.9, felt=True)
    s.piano(S0 + 0.5, [midi("E5")], 0.4, 0.5, felt=True)
    s.kick(S0, "soft", 0.6, -6)
    s.kick(S0 + 0.5, "soft", 0.5, -8)
    s.sustain(S0, O0, "air", 62, 81, 3, -10, attack=0.4, release=0.4, bright=0.6)
    s.rise(S0, O0, -6, 300, 6000, seed=3)
    s.swell_into(O0, 0.9, 1)
    s.changes(O0, [(4, "Dm9"), (2, "Bb")])
    s.impact(O0, 1.0)
    for i, nn in enumerate(notes("D4 E4 F4 A4 C5 D5 E5 F5 A5 C6 D6 E6")):  # every colour
        s.note("pluck", "harp", O0 + 0.03 * i, nn, 0.7, 0.8, -3, pan=-0.8 + 0.145 * i)
    s.groove(O0, m["rise"] - 0.5, {"kick": "X...x...X...x...", "clap": "....x.......x...", "hat": "-o-o-o-o-o-o-o-o"}, -1)
    s.arp(O0, m["rise"], "pluck", "pizz", 0.125, (0, 1, 2, 3, 2, 3, 1, 2), 62, 86, 4, 0.7, -2)
    s.bassline(O0, m["rise"], "x.x.x.x.x.x.x.x.", "pluck", vel=0.8)
    presto(O0, m["rise"], 0.6, gain=-3, lh=False)
    s.sustain(O0, m["rise"], "strings", 50, 74, 4, -6, 0.65, attack=0.5)
    s.fill(m["rise"] - 0.5, m["rise"], "snare", -16, -6)

    # ---------------------------------------------------------------- the wave
    R0, J0 = m["rise"], m["jump"]
    s.changes(R0, [(2, "Bbmaj7"), (2, "C")])
    s.impact(R0, 0.9)
    s.piano(R0, notes("Bb4 D5 F5 A5"), 0.9, 0.5)
    t = R0 + 1.0
    while t < J0 - 0.125 - 1e-6:  # the kick doubles, then doubles again
        s.kick(t, "pop", 0.9, -2)
        t += 0.25 if t < J0 - 0.5 else 0.125
    s.comp(R0, J0 - 0.125, "XxxxXxxxXxxxXxxx", 41, 65, 2, 0.75, 0.11, order=(0, 1))
    s.bassline(R0, J0 - 0.125, "x.x.x.x.x.x.x.x.", "round", vel=0.85)
    s.sustain(R0, J0, "strings", 52, 76, 4, -4, 0.8, attack=1.6, release=0.3)
    s.fill(R0 + 1.0, J0 - 0.125, "snare", -14, 1)
    s.rise(R0 + 0.3, J0, 0, 300, 12000, seed=4)
    s.swell_into(J0, 1.0, 2)

    # ---------------------------------------------------------------- the jump: out into the world
    s.changes(J0, [(2, "Dm"), (2, "Bb"), (2, "F"), (2, "C")])
    s.impact(J0, 1.7, 1)
    chorus_drums(J0, m["back"] - 0.5, 1)
    s.groove(J0, m["back"] - 0.5, {"snare": "....x.......x..."}, -4)
    s.bassline(J0, m["back"], "X.x.x.x.X.x.x.x.", "round", vel=0.9, fifths="R.O.R.O.R.O.R.O.")
    presto(J0, m["back"], 0.85, gain=1)
    hook(J0, ["Dm", "Bb", "F", "C"], 0.95, strings=True, gain=1)
    s.sustain(J0, m["back"], "choir", 62, 81, 4, -5, 0.75, attack=0.25, release=0.6)
    s.sustain(J0, m["back"], "strings", 50, 74, 4, -5, 0.85, attack=0.2, release=0.5)
    for i in range(4):  # a fill out of the tunnel
        s.strike("tom", "", m["back"] - 0.5 + 0.125 * i, 0.9, 0, i, 150 - 20 * i)

    # ---------------------------------------------------------------- back on the stage: hush, then build to the lights
    K0 = m["back"]
    s.changes(K0, [(4, "Dm"), (4, "Bbmaj7"), (4, "F"), (2, "C")])
    s.comp(K0, m["show"], "x.o.x.o.x.o.x.o.", 60, 76, 3, 0.5, 0.11, order=PRESTO_ORDER, gain=-2)
    s.sustain(K0, m["sheet"], "sub", gain=-5)
    s.groove(K0 + 2.0, m["lasers"], {"snap": "....x.......x...", "kick:soft": "X.......X......."}, -2)
    for i, b0 in enumerate((m["burst"], m["burst"] + 0.35, m["burst"] + 0.7)):  # the light fires, and the piano with it
        s.piano(b0, [notes("A5 D6")[0] + 12 * (i == 2), notes("A5 D6")[1]], 0.62 + 0.06 * i, 0.15, gain=-1)
    s.bassline(m["sheet"], m["show"] - 0.25, "x..x..x.x..x..x.", "finger", vel=0.75)
    s.groove(m["sheet"], m["lasers"], {"shaker": "xoxoxoxoxoxoxoxo"}, -2)
    s.groove(m["lasers"], m["show"] - 0.5, {"kick": "X...x...X...x...", "hat": "xoxoxoxoxoxoxoxo", "clap": "....x.......x..."}, -2)
    s.arp(m["lasers"], m["show"], "pluck", "pizz", 0.125, (0, 1, 2, 3, 2, 1), 64, 86, 4, 0.65, -3)
    s.fill(m["show"] - 1.0, m["show"], "snare", -16, -2)
    s.rise(m["show"] - 1.5, m["show"], -3, seed=5)
    s.swell_into(m["show"], 0.6, -1)

    # ---------------------------------------------------------------- the lights come up
    H0 = m["show"]
    s.changes(H0, [(2, "F"), (2, "C"), (2, "Bb")])
    s.impact(H0, 0.8, -1)
    chorus_drums(H0, m["console"])
    s.bassline(H0, m["console"], "X.x.x.x.X.x.x.x.", "round", vel=0.85, fifths="R.O.R.O.R.O.R.O.")
    presto(H0, m["console"], 0.78)
    hook(H0, ["F", "C", "Bb"], 0.85)
    s.sustain(H0, m["console"], "strings", 50, 74, 4, -6, 0.75, attack=0.25)

    # ---------------------------------------------------------------- the console: six dials, each with its note
    C0 = m["console"]
    s.changes(C0, [(4, "Bb"), (4, "F"), (4, "C")])
    s.groove(C0, m["pillars"] - 1.0, {"kick": "X......xX.......", "snap": "....x.......x...", "shaker": "xoxoxoxoxoxoxoxo"}, -1)
    s.bassline(C0, m["pillars"] - 0.5, "x..x..x.x..x..x.", "finger", vel=0.8)
    s.comp(C0, m["pillars"] - 0.5, ".x.x.x.x.x.x.x.x", 58, 74, 3, 0.52, 0.11)
    s.sustain(C0, m["pillars"], "warm", 50, 70, 4, -8)
    penta = notes("F5 G5 A5 C6 D6 F6 G6 A6 C7")
    for i, end in enumerate((84, 22, 74, 92, 72, 96)):  # each dial lands on a note as high as its value
        s.note("mallet", "marimba", m["knobs"] + 0.5 * i + 0.85, penta[min(8, int(end / 100 * 9))], 0.7, 0.4, -1, pan=-0.4)
    s.fill(m["pillars"] - 1.0, m["pillars"], "snare", -18, -4, kicks=True)
    s.swell_into(m["pillars"], 1.0)

    # ---------------------------------------------------------------- four places, one line, one point
    s.changes(m["pillars"], [(1, "Dm"), (1, "Bb"), (1, "F"), (3, "C")])
    for k, ch in enumerate(("Dm", "Bb", "F", "C")):
        t0 = m["pillars"] + 0.5 * k
        s.impact(t0, 0.6 + 0.15 * k, -3, crash=k == 0)
        s.comp(t0, t0 + 0.4, "X", 55, 79, 4, 0.9, 0.42)
        s.comp(t0, t0 + 0.4, "X", 33, 50, 2, 0.85, 0.45)
        s.strings_hit(t0, [midi(x) for x in {"Dm": ("D4", "A4", "D5", "F5"), "Bb": ("D4", "F4", "Bb4", "D5"), "F": ("C4", "F4", "A4", "C5"), "C": ("C4", "E4", "G4", "C5")}[ch]], 0.42, 0.9, -2)
        s.strike("tom", "", t0, 0.9, -1, k, 90 + 18 * k)
    s.groove(m["pillars"] + 2.0, m["converge"], {"kick": "X.......X.......", "clap": "........X......."}, -2)
    s.sustain(m["pillars"] + 2.0, m["converge"], "sub", gain=-4)
    s.changes(m["converge"], [(2, "Bb"), (3, "Csus4"), (2, "C")])
    presto(m["converge"], m["lock"] - 0.125, 0.55, gain=-2, lh=False)
    s.rise(m["converge"], m["point"], -4, seed=6)
    s.kick(m["point"], "pop", 1.0, -1)
    s.groove(m["point"], m["lock"] - 1.0, {"kick": "X...x...X...x...", "clap": "....x.......x..."}, -1)
    s.bassline(m["point"], m["lock"] - 0.125, "x.x.x.x.x.x.x.x.", "round", vel=0.85)
    s.sustain(m["point"], m["lock"], "strings", 52, 76, 4, -4, 0.8, attack=1.5, release=0.3)
    t = m["lock"] - 1.0
    while t < m["lock"] - 0.125 - 1e-6:
        s.kick(t, "pop", 0.95, -1)
        t += 0.25 if t < m["lock"] - 0.5 else 0.125
    s.fill(m["lock"] - 1.5, m["lock"] - 0.125, "snare", -14, 1)
    s.rise(m["point"], m["lock"], 0, 260, 12000, seed=7)
    s.swell_into(m["lock"], 1.0, 2)

    # ---------------------------------------------------------------- the name: 灵感台
    Z0 = m["lock"]
    s.changes(Z0, [(2, "F"), (2, "C"), (2, "Dm"), (1, "Bb")])
    s.impact(Z0, 1.8, 2)
    chorus_drums(Z0, m["dark"], 1)
    s.groove(Z0, m["dark"], {"snare": "....x.......x..."}, -4)
    s.bassline(Z0, m["dark"], "X.x.x.x.X.x.x.x.", "round", vel=0.9, fifths="R.O.R.O.R.O.R.O.")
    presto(Z0, m["dark"], 0.88, gain=1)
    hook(Z0, ["F", "C", "Dm", "Bb"], 0.95, until=m["dark"], strings=True, gain=1)
    s.sustain(Z0, m["dark"], "choir", 62, 81, 4, -4, 0.8, attack=0.2, release=0.3)
    s.sustain(Z0, m["dark"], "strings", 50, 74, 4, -5, 0.85, attack=0.2, release=0.3)

    # ---------------------------------------------------------------- the residents (after the held breath)
    U0 = m["cut"]
    s.changes(U0, [(4, "F")])
    s.piano(U0, notes("F3 C4"), 0.42, 1.8, felt=True)
    s.piano(U0 + 1.0, notes("A4"), 0.4, 0.9, felt=True)
    s.groove(U0, m["swarm"], {"kick:soft": "X.......X.......", "snap": ("....o.......o...", -4.0)}, -6)
    S1 = m["swarm"]
    s.changes(S1, [(4, "F"), (4, "Dm"), (4, "Bb"), (4, "C"), (4, "F"), (4, "C")])
    for beat, nm, beats in TUNE:  # the residents' tune: marimba, a pizzicato an octave down
        s.note("mallet", "marimba", S1 + beat * BEAT, midi(nm), 0.78, beats * BEAT, 0, pan=0.12)
        s.note("pluck", "pizz", S1 + beat * BEAT, midi(nm) - 12, 0.6, 0.25, -6, pan=-0.12)
    s.groove(S1, GARDEN - 1.0, {"kick": "X.....x.X.......", "clap": ("....x.......x...", -3.0), "shaker": "xoxoxoxoxoxoxoxo", "rim": ("...x...x...x...x", -6.0)}, -2, swing=0.12)
    s.bassline(S1, GARDEN - 0.5, "x..x..x.x.....x.", "finger", vel=0.75, swing=0.12)
    s.comp(S1, GARDEN - 0.5, ".x.x.x.x.x.x.x.x", 53, 67, 3, 0.4, 0.1, swing=0.12, gain=-3)

    # ---------------------------------------------------------------- the back garden
    s.changes(GARDEN, [(4, "Bbmaj7"), (2, "F"), (2, "C")])
    s.comp(GARDEN, m["device"] - 1.0, "x.o.x.o.", 55, 74, 4, 0.42, 0.6, felt=True, order=(0, 2, 1, 3), step=0.25)
    s.sustain(GARDEN, m["device"], "strings", 50, 72, 4, -8, 0.5, attack=1.2, release=0.6)
    for beat, nm, beats in ((0, "F6", 1.5), (1.5, "D6", .5), (2, "C6", 1), (3, "A5", 1), (4, "C6", 1), (5, "A5", 1)):
        s.note("mallet", "vibes", GARDEN + beat * BEAT, midi(nm), 0.55, beats * BEAT, -2, pan=0.1)
    s.fill(m["device"] - 1.0, m["device"], "snare", -22, -4, kicks=True)
    s.rise(m["device"] - 1.2, m["device"], -3, seed=8)
    s.swell_into(m["device"], 1.0)

    # ---------------------------------------------------------------- made for one screen
    D0 = m["device"]
    s.changes(D0, [(4, "Dm"), (4, "Bbmaj7"), (2, "F"), (2, "C"), (2, "Dm"), (2, "Bb")])
    s.impact(D0, 1.2)
    chorus_drums(D0, m["walls"] - 0.25)
    s.bassline(D0, m["walls"] - 0.25, "X.x.x.x.X.x.x.x.", "round", vel=0.85, fifths="R.O.R.O.R.O.R.O.")
    presto(D0, m["walls"] - 0.125, 0.75)
    s.sustain(D0, m["walls"], "strings", 50, 74, 4, -7, 0.7, attack=0.3)
    for i in range(4):  # the numbers slam down
        t0 = m["specs"] + 0.5 * i
        s.mix["fx"].add(kit.impact(0.5, i), t0, -10)
        s.strike("tom", "", t0, 0.9, -1, i, 140 - 14 * i)
        s.piano(t0, [n + 12 for n in notes("F4 A4 D5")] if i % 2 else notes("D5 F5 A5"), 0.85, 0.22)
    hook(D0 + 4.0, ["F", "C", "Dm", "Bb"], 0.85)

    # ---------------------------------------------------------------- three wallpapers
    W0 = m["walls"]
    s.changes(W0, [(2, "F"), (2, "C/E"), (2, "Dm")])
    for i, t0 in enumerate(WALL["calls"]):
        s.impact(t0, 0.75 + 0.1 * i, -2, crash=i == 0)
        s.piano(t0, [midi(x) + 12 for x in (("F4", "A4", "C5"), ("E4", "G4", "C5"), ("D4", "F4", "A4"))[i]], 0.88, 0.3)
        for j, nn in enumerate((("C5", "F5", "A5"), ("C5", "E5", "G5"), ("A4", "D5", "F5"))[i]):  # a flourish into each
            s.piano(t0 - 0.1875 + 0.0625 * j, [midi(nn) + 12], 0.6, 0.08, gain=-3, role="melody")
    chorus_drums(W0, WALL["float"], 0, hats=False)
    s.bassline(W0, WALL["float"], "X.x.x.x.X.x.x.x.", "round", vel=0.85, fifths="R.O.R.O.R.O.R.O.")
    presto(W0, WALL["float"], 0.72, lh=False)
    s.sustain(W0, WALL["float"], "strings", 50, 74, 4, -6, 0.75, attack=0.2)

    # glass in the air: half-time, light, the celesta turning over like light on glass
    G0, G1 = WALL["float"], W0 + 5.5
    s.changes(G0, [(2, "Bbmaj7"), (2, "Gm9"), (1, "Csus4")])
    s.impact(G0, 0.4, -10, crash=False)
    s.arp(G0 + 0.25, G1, "mallet", "celesta", 0.125, (0, 2, 1, 3, 2, 4, 3, 1), 72, 93, 4, 0.5, -3, "mallets")
    s.groove(G0, G1, {"kick:soft": "X.......X.......", "snap": "........X.......", "shaker": ("xoxoxoxoxoxoxoxo", -5.0)}, -3)
    s.comp(G0, G1, "X.......x.......", 53, 72, 4, 0.5, 0.9, gain=-2)
    s.sustain(G0, G1, "air", 62, 81, 3, -8, attack=0.6, release=0.5, bright=0.7)
    s.sustain(G0, G1, "sub", gain=-7)

    # the device rises; the cards land on it one by one; the picker; a tap
    s.changes(G1, [(2, "C"), (3, "F"), (0.5, "F")])
    s.rise(G1 - 0.6, WALL["risen"], -10, 200, 4000, seed=12)
    for i, t0 in enumerate(WALL["land"]):
        s.piano(t0, [midi(("A5", "C6", "F6")[i])], 0.62, 0.5, gain=-1, role="melody")
    s.kick(WALL["risen"], "soft", 0.8, -4)
    s.comp(WALL["land"][2], WALL["open"], "x...o...x...o...", 55, 74, 4, 0.45, 0.4, gain=-3)
    s.groove(WALL["land"][2], WALL["open"], {"snap": "....x.......x...", "shaker": ("xoxoxoxoxoxoxoxo", -5.0)}, -4)
    s.sustain(G1, WALL["open"], "warm", 50, 70, 4, -10, attack=0.5)
    s.sustain(G1, WALL["open"], "sub", gain=-7)
    s.piano(WALL["pick"], notes("C6 G6"), 0.55, 0.6, gain=-2, role="melody")

    # chosen: it opens, and night falls
    s.changes(WALL["open"], [(3, "Gm9")])
    s.impact(WALL["open"], 0.5, -8, crash=False)
    s.sustain(WALL["open"], m["tag"], "strings", 50, 74, 4, -4, 0.7, attack=0.25, release=1.0)
    s.piano(WALL["open"], notes("G3 D4 A4 Bb4 F5"), 0.62, 1.4, felt=True, spread=0.04)
    s.piano(WALL["fall"], notes("D6"), 0.4, 0.8, felt=True, role="melody")
    s.piano(WALL["fall"] + 0.375, notes("A5"), 0.36, 0.8, felt=True, role="melody")

    # ---------------------------------------------------------------- launch from here; the lift to D major
    T0, F2 = m["tag"], m["flash2"]
    s.changes(T0, [(2, "Bb"), (2, "A")])
    presto(T0, F2 - 0.125, 0.6, gain=-1)
    t = T0 + 1.0
    while t < F2 - 0.125 - 1e-6:
        s.kick(t, "pop", 0.9, -2)
        t += 0.25 if t < F2 - 0.5 else 0.125
    s.bassline(T0, F2 - 0.125, "x.x.x.x.x.x.x.x.", "round", vel=0.8)
    s.sustain(T0, F2, "strings", 52, 76, 4, -3, 0.8, attack=1.6, release=0.3)
    s.fill(T0, F2 - 0.125, "snare", -20, 0)
    s.rise(T0 + 0.4, F2, 0, 300, 12000, seed=9)
    s.swell_into(F2, 1.0, 2)

    s.changes(F2, [(2, "D"), (2, "A"), (2, "Bm"), (2, "G")])
    s.impact(F2, 1.9, 2)
    chorus_drums(F2, F2 + 4.0, 1)
    s.groove(F2, F2 + 4.0, {"snare": "....x.......x..."}, -4)
    s.bassline(F2, F2 + 4.0, "X.x.x.x.X.x.x.x.", "round", vel=0.9, fifths="R.O.R.O.R.O.R.O.")
    presto(F2, F2 + 4.0, 0.85, gain=1)
    hook(F2, ["D", "A", "Bm", "G"], 0.95, strings=True, gain=1)
    s.sustain(F2, F2 + 4.0, "choir", 62, 81, 4, -4, 0.8, attack=0.2, release=0.5)
    s.sustain(F2, F2 + 4.0, "strings", 50, 74, 4, -5, 0.85, attack=0.2, release=0.5)

    end = F2 + 4.0
    s.changes(end, [(8, "Dadd9")])
    s.impact(end, 1.4)
    tail = m["end"] - end
    s.piano(end, notes("D2 A2 D3 F#3 A3 E4 F#4 A4 D5"), 0.85, tail, spread=0.012)
    s.sustain(end, m["end"], "strings", 50, 76, 5, -4, 0.75, attack=0.05, release=1.2)
    s.sustain(end, m["end"], "choir", 62, 79, 4, -6, 0.7, attack=0.1, release=1.2)
    s.sustain(end, m["end"], "sub", gain=-3)
    for i, nn in enumerate(notes("D6 F#6 A6 D7")):
        s.note("mallet", "celesta", end + 0.25 * i, nn, 0.55, 1.0, -4, pan=-0.3 + 0.2 * i)
    return s
