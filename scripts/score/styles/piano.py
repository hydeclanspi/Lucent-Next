"""Piano and pulse: the product film.

A grand piano carries a lyrical theme over a soft synth pulse in eighths; strings and cellos lift under it;
a felt piano, close and quiet, for the beginning, the garden and the night. The drums stay out of the way
until the reveals, where they arrive big and slow. The widest range of the six versions: the quietest
scenes are a single piano. E-flat major, lifting to F major for the last words.
"""
from .. import tonal
from ..clock import BEAT, GARDEN, M, WALL
from ..song import Song
from ..theory import midi, notes
from .common import SPECS, build

THEME = {
    "Eb": ((0, "G5", 1.0), (1, "Bb5", .5), (1.5, "G5", .5)),
    "Bb/D": ((0, "F5", 1.5), (1.5, "D5", .5)),
    "Cm7": ((0, "Eb5", .5), (.5, "G5", .5), (1, "Bb5", .75), (1.75, "C6", .25)),
    "Abmaj7": ((0, "C6", 1.0), (1, "Bb5", .5), (1.5, "Ab5", .5)),
    "Ab": ((0, "C6", 1.0), (1, "Bb5", .5), (1.5, "Ab5", .5)),
    "Bb": ((0, "F5", 1.0), (1, "D5", .5), (1.5, "Bb4", .5)),
}


def compose():
    s = Song("钢琴与脉冲 · Piano & Pulse", "Eb4", "major", fader_depth=3.5,
             bell=lambda m, v=0.6: tonal.mallet(int(m), "celesta", round(v, 2)),
             pluck=lambda m, v=0.6: tonal.mallet(int(m), "celesta", round(v, 2)))
    s.mix["bass"].duck = 0.2
    s.tilt = s.tilt + (("lowshelf", 60, -2.5, 0.7), ("highshelf", 7000, -4.0, 0.7))
    m = M

    def theme(a, names, vel=0.8, until=None, strings=True, octave=True, gain=0.0, transpose=0):
        for k, name in enumerate(names):
            for beat, nm, beats in THEME[name]:
                t0 = a + (2 * k + beat) * BEAT
                if until is not None and t0 >= until - 1e-6:
                    return
                n0 = midi(nm) + transpose
                h = beats * BEAT * 0.95
                s.piano(t0, [n0, n0 - 12] if octave else [n0], vel, h + 0.2, gain=gain + 1, role="melody")
                if strings:
                    s.mix["strings"].add(tonal.strings((n0 - 12,), round(h + 0.1, 3), 0.75, 0.08, 0.35, "legato", 5, int(t0 * 8) % 5), t0, gain - 3)

    def pulse(a, b, vel=0.6, gain=0.0, step=0.25, pat="x"):
        """The synth pulse: soft plucked chords in eighths, under everything."""
        s.arp(a, b, "bass", "pluck", step, (0, 1, 2, 1), 55, 72, 3, vel, gain - 8, bus="plucks", hold=step * 0.8, pat=pat)

    def big(a, b, g=0.0):
        s.groove(a, b, {"kick:deep": "X.......X.......", "snare": "....X.......X...", "tom": ("..............x.", -4.0, 90), "shaker": ("xoxoxoxoxoxoxoxo", -3.0)}, g)
        s.bassline(a, b, "X...x...X...x...", "round", vel=0.85, gain=g)

    def calm(a, b, g=0.0):
        s.groove(a, b, {"rim": "....x.......x...", "shaker": ("x-x-x-x-x-x-x-x-", -4.0)}, g - 2)
        s.sustain(a, b, "sub", gain=g - 6)

    # ---------------------------------------------------------------- once upon a time: a felt piano, alone
    s.changes(0.0, [(4, "Ebmaj9"), (4, "Abmaj7")])
    for beat, nm, beats, v in ((1, "G4", 1, .42), (2, "Bb4", 1, .45), (3, "D5", .5, .45), (3.5, "Eb5", .5, .4),
                               (5, "C5", 1, .45), (6, "Eb5", .5, .5), (6.5, "G5", .5, .52), (7, "Bb5", 1, .5)):
        s.piano(beat * BEAT, [midi(nm)], v, beats * BEAT * 1.8, felt=True, gain=3, role="melody")
    s.piano(0.0, notes("Eb2 Bb2"), 0.45, 1.9, felt=True, gain=1)
    s.piano(2.0, notes("Ab2 Eb3"), 0.45, 1.9, felt=True, gain=1)
    s.sustain(0.8, m["press1"], "strings", 51, 70, 3, -10, 0.4, attack=2.0, release=1.0)

    # ---------------------------------------------------------------- the Home button: the pulse begins
    P1, P2 = m["press1"], m["press2"]
    s.changes(P1, [(4, "Ebmaj7"), (2, "Bb/D")])
    s.impact(P1, 0.35, -9, crash=False)
    pulse(P1, P2, 0.5)
    s.comp(P1, P2, "x...............", 51, 70, 4, 0.5, 1.9, felt=True)
    s.piano(m["home"] + 0.5, notes("Bb5 Eb6 G6"), 0.5, 1.0, gain=-3, role="melody")
    for i in range(10):
        s.note("mallet", "celesta", m["home"] + 1.0 + 0.125 * i, notes("Eb5 G5 Bb5 C6 Eb6 G6 Bb6 C7 Eb7 G7")[i], 0.4 + 0.03 * i, 0.4, -6, pan=-0.6 + 0.13 * i)

    # ---------------------------------------------------------------- the build: strings rise
    s.changes(P2, [(4, "Cm7"), (2, "Abmaj7"), (2, "Bb"), (2, "Bbsus4")])
    s.impact(P2, 0.6, -5, crash=False)
    pulse(P2, m["flash"], 0.6, 1)
    s.comp(P2, m["flash"], "x.......x.......", 51, 72, 4, 0.6, 0.95)
    s.sustain(P2, m["flash"], "strings", 46, 74, 5, -3, 0.65, attack=2.5, release=0.5)
    s.groove(P2 + 3.0, m["flash"] - 0.25, {"kick:deep": "X.......X......."}, -6)
    build(s, m["flash"] - 2.0, m["flash"], fill="tom", seed=1)

    # ---------------------------------------------------------------- a place: the theme, full
    F0 = m["flash"]
    s.changes(F0, [(2, "Eb"), (2, "Bb/D"), (2, "Cm7"), (2, "Abmaj7")])
    s.impact(F0, 1.4)
    big(F0, m["bench"])
    theme(F0, ["Eb", "Bb/D", "Cm7", "Abmaj7"], 0.9)
    s.comp(F0, m["bench"], "x...x...x...x...", 48, 70, 4, 0.7, 0.45)
    pulse(F0, m["bench"], 0.65, 2)
    s.sustain(F0, m["bench"], "strings", 46, 74, 5, -4, 0.8, attack=0.4)

    # ---------------------------------------------------------------- the workbench: piano and pulse
    B0 = m["bench"]
    s.changes(B0, [(4, "Cm7"), (4, "Abmaj7"), (3, "Eb"), (2, "Bb")])
    calm(B0, m["implode"])
    pulse(B0, m["implode"] + 0.5, 0.6)
    s.comp(B0, m["implode"], "x..x..x.x..x..x.", 55, 74, 3, 0.55, 0.3)
    s.bassline(B0, m["implode"], "x.......x.......", "round", vel=0.7)
    for i, ch in enumerate(("Eb5 G5 C6", "G5 C6 Eb6", "C6 Eb6 G6", "Eb6 G6 C7")):
        t0 = m["explode"] + 0.5 + 0.25 * i
        s.piano(t0, notes(ch), 0.65 + 0.05 * i, 0.3)
        s.strike("tom", "", t0, 0.8, -4, i, 98 + 22 * i)
    s.kick(m["implode"] + 0.9, "deep", 0.8, -6)

    # ---------------------------------------------------------------- the launch pad
    L0 = m["launch"]
    s.changes(L0, [(4, "Cm7"), (2, "Ab"), (1, "Bb")])
    s.comp(L0, m["warp"], "x.......x.......", 51, 72, 4, 0.45, 0.9, felt=True)
    pulse(L0, m["warp"], 0.45, -2)
    for i, nn in enumerate(notes("Eb5 G5 Bb5 C6 Eb6 G6 Bb6 C7 Eb7")):
        s.piano(m["fly"] + 0.03 + i * 0.045, [nn], 0.45 + 0.05 * i, 0.15, gain=-2, role="melody")
    build(s, m["warp"], m["slit"], fill=None, gain=-3, seed=2)

    # ---------------------------------------------------------------- the narrow way; the door
    S0, O0 = m["slit"], m["open"]
    s.changes(S0, [(2, "Cm9")])
    s.piano(S0, notes("G5"), 0.42, 1.0, felt=True, role="melody")
    s.piano(S0 + 0.5, notes("D5"), 0.38, 0.6, felt=True, role="melody")
    s.sustain(S0, O0, "strings", 58, 79, 3, -8, 0.45, attack=0.5)
    s.swell_into(O0, 0.9, -2)
    s.changes(O0, [(4, "Cm9"), (2, "Abmaj7")])
    s.impact(O0, 0.9, -2)
    for i, nn in enumerate(notes("C4 D4 Eb4 G4 Bb4 C5 D5 Eb5 G5 Bb5 C6 D6")):
        s.note("pluck", "harp", O0 + 0.03 * i, nn, 0.7, 0.9, -3, pan=-0.8 + 0.145 * i)
    pulse(O0, m["rise"], 0.65, 1, 0.125)
    s.comp(O0, m["rise"], "x.......x.......", 48, 70, 4, 0.6, 0.9)
    s.sustain(O0, m["rise"], "strings", 46, 74, 5, -5, 0.7, attack=0.6)
    s.groove(O0, m["rise"], {"kick:deep": "X.......X.......", "rim": "....x.......x...", "shaker": "x-x-x-x-x-x-x-x-"}, -3)

    # ---------------------------------------------------------------- the wave
    R0, J0 = m["rise"], m["jump"]
    s.changes(R0, [(2, "Abmaj7"), (2, "Bb")])
    s.impact(R0, 0.8, -1)
    s.comp(R0, J0 - 0.125, "xxxxxxxxxxxxxxxx", 43, 67, 2, 0.7, 0.11, order=(0, 1))
    s.sustain(R0, J0, "strings", 48, 77, 5, -2, 0.85, attack=1.7, release=0.2)
    s.groove(R0 + 1.0, J0 - 0.125, {"taiko": "X...x...x.x.xxxx"}, -4)
    build(s, R0 + 0.5, J0, fill="tom", seed=3)

    # ---------------------------------------------------------------- out into the world: the theme, biggest
    s.changes(J0, [(2, "Cm7"), (2, "Abmaj7"), (2, "Eb"), (2, "Bb")])
    s.impact(J0, 1.7, 1)
    big(J0, m["back"] - 0.25, 1)
    s.groove(J0, m["back"] - 0.25, {"taiko": ("X...............", 0.0)}, -2)
    theme(J0, ["Cm7", "Abmaj7", "Eb", "Bb"], 0.95, gain=1)
    s.comp(J0, m["back"], "x...x...x...x...", 48, 72, 4, 0.75, 0.45)
    pulse(J0, m["back"], 0.7, 2, 0.125)
    s.sustain(J0, m["back"], "strings", 46, 76, 5, -3, 0.9, attack=0.3)
    s.sustain(J0, m["back"], "choir", 60, 79, 4, -9, 0.6, attack=0.4, vowel="o")

    # ---------------------------------------------------------------- the stage: piano alone, then the build
    K0 = m["back"]
    s.changes(K0, [(4, "Cm7"), (4, "Abmaj7"), (4, "Eb"), (2, "Bb")])
    s.comp(K0, m["sheet"], "x.......x.......", 51, 72, 4, 0.5, 0.95, felt=True)
    for i, b0 in enumerate((m["burst"], m["burst"] + 0.35, m["burst"] + 0.7)):
        s.piano(b0, notes(("Bb5 Eb6", "Bb5 Eb6", "Eb6 G6")[i]), 0.55 + 0.05 * i, 0.25, role="melody")
    pulse(m["sheet"], m["show"], 0.6, 0, 0.125)
    s.comp(m["sheet"], m["show"], "x.......x.......", 51, 72, 4, 0.6, 0.9)
    calm(m["sheet"], m["show"] - 0.5)
    s.sustain(m["lasers"], m["show"], "strings", 46, 74, 5, -4, 0.7, attack=1.5)
    build(s, m["show"] - 1.0, m["show"], fill="tom", gain=-2, seed=4)

    # ---------------------------------------------------------------- the lights
    H0 = m["show"]
    s.changes(H0, [(2, "Eb"), (2, "Bb/D"), (2, "Ab")])
    s.impact(H0, 0.8, -1)
    big(H0, m["console"])
    theme(H0, ["Eb", "Bb/D", "Ab"], 0.88)
    pulse(H0, m["console"], 0.65, 1, 0.125)
    s.sustain(H0, m["console"], "strings", 46, 74, 5, -4, 0.8, attack=0.3)

    # ---------------------------------------------------------------- the console
    C0 = m["console"]
    s.changes(C0, [(4, "Ab"), (4, "Eb"), (4, "Bb")])
    calm(C0, m["pillars"] - 1.0, 1)
    pulse(C0, m["pillars"], 0.6, 0, 0.125)
    s.comp(C0, m["pillars"] - 0.5, "x..x..x.x..x..x.", 55, 74, 3, 0.55, 0.3)
    s.bassline(C0, m["pillars"] - 0.5, "x.......x.......", "round", vel=0.7)
    for i, end in enumerate((84, 22, 74, 92, 72, 96)):
        s.note("mallet", "celesta", m["knobs"] + 0.5 * i + 0.85, notes("Eb5 F5 G5 Bb5 C6 Eb6 F6 G6 Bb6")[min(8, int(end / 100 * 9))], 0.6, 0.6, -3, pan=-0.4)
    build(s, m["pillars"] - 1.0, m["pillars"], fill="tom", seed=5)

    # ---------------------------------------------------------------- four places, one point
    s.changes(m["pillars"], [(1, "Cm"), (1, "Ab"), (1, "Eb"), (3, "Bb")])
    for k, ch in enumerate(("C4 G4 C5 Eb5", "C4 Ab4 C5 Eb5", "Bb3 Eb4 G4 Bb4", "Bb3 D4 F4 Bb4")):
        t0 = m["pillars"] + 0.5 * k
        s.impact(t0, 0.6 + 0.15 * k, -3, crash=k == 0)
        s.piano(t0, notes(ch) + [notes(ch)[0] - 24], 0.85, 0.45)
        s.strings_hit(t0, notes(ch), 0.45, 0.9, -1)
        s.strike("taiko", "", t0, 0.9, -2, k)
    s.changes(m["converge"], [(2, "Ab"), (3, "Bbsus4"), (2, "Bb")])
    pulse(m["converge"], m["lock"], 0.6, 1, 0.125)
    s.sustain(m["converge"], m["lock"], "strings", 48, 77, 5, -3, 0.85, attack=2.0, release=0.2)
    s.kick(m["point"], "deep", 1.0, -2)
    s.groove(m["point"], m["lock"] - 0.125, {"taiko": "X.......X...x.x.", "tom": ("....x.......xxxx", -4.0, 110)}, -3)
    build(s, m["point"], m["lock"], fill="tom", seed=6)

    # ---------------------------------------------------------------- the name
    Z0 = m["lock"]
    s.changes(Z0, [(2, "Eb"), (2, "Bb/D"), (2, "Cm7"), (1, "Ab")])
    s.impact(Z0, 1.8, 2)
    big(Z0, m["dark"], 1)
    s.groove(Z0, m["dark"], {"taiko": "X..............."}, -2)
    theme(Z0, ["Eb", "Bb/D", "Cm7", "Ab"], 0.95, until=m["dark"], gain=1)
    pulse(Z0, m["dark"], 0.7, 2, 0.125)
    s.sustain(Z0, m["dark"], "strings", 46, 76, 5, -3, 0.9, attack=0.25, release=0.3)
    s.sustain(Z0, m["dark"], "choir", 60, 79, 4, -8, 0.65, attack=0.3, release=0.3, vowel="o")

    # ---------------------------------------------------------------- the residents
    U0 = m["cut"]
    s.changes(U0, [(4, "Eb")])
    s.piano(U0, notes("Eb3 Bb3"), 0.4, 1.8, felt=True)
    S1 = m["swarm"]
    s.changes(S1, [(4, "Eb"), (4, "Cm"), (4, "Ab"), (4, "Bb"), (4, "Eb"), (4, "Bb")])
    from .fusion import TUNE
    for beat, nm, beats in TUNE:
        s.note("mallet", "celesta", S1 + beat * BEAT, midi(nm) - 2, 0.62, beats * BEAT, -1, pan=0.12)
        s.piano(S1 + beat * BEAT, [midi(nm) - 14], 0.4, beats * BEAT * 0.9, felt=True, gain=-4, role="melody")
    pulse(S1, GARDEN, 0.55, -1, 0.25)
    calm(S1, GARDEN - 1.0)
    s.bassline(S1, GARDEN - 0.5, "x.......x.......", "round", vel=0.6)

    # ---------------------------------------------------------------- the back garden
    s.changes(GARDEN, [(4, "Abmaj7"), (2, "Eb"), (2, "Bb")])
    s.comp(GARDEN, m["device"] - 0.5, "x.o.x.o.", 51, 72, 4, 0.6, 0.6, felt=True, gain=8, order=(0, 2, 1, 3), step=0.25)
    s.sustain(GARDEN, m["device"], "strings", 46, 72, 5, -7, 0.5, attack=1.4, release=0.5)
    build(s, m["device"] - 1.2, m["device"], fill="tom", gain=-2, seed=7)

    # ---------------------------------------------------------------- made for one screen
    D0 = m["device"]
    s.changes(D0, [(4, "Cm7"), (4, "Abmaj7"), (2, "Eb"), (2, "Bb"), (2, "Cm7"), (2, "Ab")])
    s.impact(D0, 1.2)
    big(D0, m["walls"] - 0.125)
    pulse(D0, m["walls"], 0.65, 1, 0.125)
    s.comp(D0, m["walls"], "x...x...x...x...", 48, 72, 4, 0.7, 0.45)
    s.sustain(D0, m["walls"], "strings", 46, 74, 5, -4, 0.8, attack=0.3)
    for i, t0 in enumerate(SPECS):
        s.impact(t0, 0.5, -6, crash=False)
        s.piano(t0, notes(("Eb5 G5 C6", "G5 C6 Eb6", "Eb5 G5 C6", "G5 C6 Eb6")[i]) + [midi("C3")], 0.85, 0.3)
        s.strike("taiko", "", t0, 0.85, -3, i)
    theme(D0 + 4.0, ["Eb", "Bb", "Cm7", "Ab"], 0.88)

    # ---------------------------------------------------------------- three wallpapers
    W0 = m["walls"]
    s.changes(W0, [(2, "Eb"), (2, "Bb/D"), (2, "Cm7")])
    for i, t0 in enumerate(WALL["calls"]):
        s.impact(t0, 0.75 + 0.1 * i, -2, crash=i == 0)
        s.piano(t0, notes(("Eb5 G5 Bb5 Eb3", "D5 F5 Bb5 D3", "Eb5 G5 C6 C3")[i]), 0.9, 0.5)
        s.strings_hit(t0, notes(("Eb4 G4 Bb4", "D4 F4 Bb4", "Eb4 G4 C5")[i]), 0.5, 0.9, -2)
    big(W0, WALL["float"])
    pulse(W0, WALL["float"], 0.65, 1, 0.125)
    G0, G1 = WALL["float"], W0 + 5.5
    s.changes(G0, [(2, "Abmaj7"), (2, "Fm9"), (1, "Bbsus4")])
    s.arp(G0 + 0.25, G1, "mallet", "celesta", 0.125, (0, 2, 1, 3, 2, 4, 3, 1), 72, 93, 4, 0.45, -3, "mallets")
    s.sustain(G0, G1, "strings", 53, 79, 4, -7, 0.55, attack=0.6)
    s.comp(G0, G1, "x.......x.......", 51, 72, 4, 0.5, 0.95, felt=True)
    s.changes(G1, [(2, "Bb"), (3, "Eb"), (0.5, "Eb")])
    s.rise(G1 - 0.6, WALL["risen"], -12, 200, 4000, seed=12)
    for i, t0 in enumerate(WALL["land"]):
        s.piano(t0, [midi(("F5", "Bb5", "Eb6")[i])], 0.6, 0.6, role="melody")
    pulse(WALL["land"][2], WALL["open"], 0.5, -2)
    s.sustain(G1, WALL["open"], "strings", 51, 74, 4, -9, 0.5, attack=0.5)
    s.piano(WALL["pick"], notes("Bb5 Eb6"), 0.55, 0.7, gain=-2, role="melody")
    s.changes(WALL["open"], [(3, "Fm9")])
    s.sustain(WALL["open"], m["tag"], "strings", 46, 74, 5, -3, 0.75, attack=0.25, release=1.2)
    s.piano(WALL["open"], notes("F2 C3 G3 Ab3 Eb4 G4"), 0.6, 1.4, felt=True, spread=0.05)
    s.piano(WALL["fall"], notes("C6"), 0.38, 0.9, felt=True, role="melody")
    s.piano(WALL["fall"] + 0.375, notes("G5"), 0.34, 0.9, felt=True, role="melody")

    # ---------------------------------------------------------------- launch from here: up to F major
    T0, F2 = m["tag"], m["flash2"]
    s.changes(T0, [(2, "Bb"), (2, "C")])
    s.comp(T0, F2 - 0.125, "xxxxxxxxxxxxxxxx", 41, 65, 2, 0.65, 0.11, order=(0, 1))
    s.sustain(T0, F2, "strings", 48, 77, 5, -2, 0.85, attack=1.6, release=0.2)
    s.groove(T0 + 1.0, F2 - 0.125, {"taiko": "X...x...x.x.xxxx"}, -4)
    build(s, T0 + 0.4, F2, fill="tom", seed=8)
    s.changes(F2, [(2, "F"), (2, "C/E"), (2, "Dm7"), (2, "Bb")])
    s.impact(F2, 1.9, 2)
    big(F2, F2 + 4.0, 1)
    s.groove(F2, F2 + 4.0, {"taiko": "X...............", "kick:pop": ("X...X...X...X...", -6.0)}, -2)
    for k, (name, cell) in enumerate((("F", "Eb"), ("C/E", "Bb/D"), ("Dm7", "Cm7"), ("Bb", "Ab"))):
        theme(F2 + 2 * k * BEAT, [cell], 0.95, gain=1, transpose=2)
    pulse(F2, F2 + 4.0, 0.7, 2, 0.125)
    s.comp(F2, F2 + 4.0, "x...x...x...x...", 48, 72, 4, 0.75, 0.45)
    s.sustain(F2, F2 + 4.0, "strings", 46, 77, 5, -3, 0.9, attack=0.25)
    s.sustain(F2, F2 + 4.0, "choir", 60, 81, 4, -7, 0.7, attack=0.3, vowel="o")
    end = F2 + 4.0
    s.changes(end, [(8, "Fadd9")])
    s.impact(end, 1.3)
    tail = m["end"] - end
    s.piano(end, notes("F1 C2 F2 A2 C3 G3 A3 C4 F4"), 0.8, tail, spread=0.014)
    s.sustain(end, m["end"], "strings", 46, 77, 5, -4, 0.7, attack=0.05, release=1.4)
    s.sustain(end, m["end"], "choir", 60, 79, 4, -9, 0.6, attack=0.15, release=1.4, vowel="o")
    for i, nn in enumerate(notes("F6 A6 C7 F7")):
        s.note("mallet", "celesta", end + 0.3 * i, nn, 0.5, 1.2, -4, pan=-0.3 + 0.2 * i)
    return s
