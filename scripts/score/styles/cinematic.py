"""Cinematic hybrid: the trailer.

A string section playing spiccato in sixteenths drives it; taiko and toms in ensemble, low brass that
opens like a door (the braam), brass stabs on the accents, a choir on the peaks, risers into every cut,
and a fanfare in octaves on strings and piano. The quiet scenes are left to a piano and a held low string.
D minor, opening into D major at the end.
"""
from .. import kit, tonal
from ..clock import BEAT, GARDEN, M, WALL
from ..song import Song, q
from ..theory import midi, notes, voice
from .common import SPECS

# The fanfare: two beats to a chord (beat, note, beats).
THEME = {
    "Dm": ((0, "A4", .5), (.5, "D5", .5), (1, "F5", 1.0)),
    "Bb": ((0, "F5", .5), (.5, "D5", .5), (1, "Bb4", 1.0)),
    "Gm": ((0, "Bb4", .5), (.5, "D5", .5), (1, "G5", 1.0)),
    "A": ((0, "A5", 1.0), (1, "G5", .5), (1.5, "E5", .5)),
    "F": ((0, "C5", .5), (.5, "F5", .5), (1, "A5", 1.0)),
    "C": ((0, "G5", 1.0), (1, "E5", .5), (1.5, "C5", .5)),
    "D": ((0, "A4", .5), (.5, "D5", .5), (1, "F#5", 1.0)),
    "A/C#": ((0, "E5", .5), (.5, "A5", .5), (1, "C#6", 1.0)),
    "Bm": ((0, "F#5", .5), (.5, "B5", .5), (1, "D6", 1.0)),
    "G": ((0, "B5", .5), (.5, "D6", .5), (1, "G6", 1.0)),
}
TAIKO = {"taiko": "X..x..x.X...x.x.", "tom": ("..x...x...x.x.xx", -5.0, 95)}


def compose():
    s = Song("电影感混合 · Cinematic", "D4", "minor", fader_depth=3.4,
             bell=lambda m, v=0.6: tonal.mallet(int(m), "celesta", round(v, 2)),
             pluck=lambda m, v=0.6: tonal.pluck(int(m), 0.6, "harp", round(v, 2)))
    s.mix["strings"].gain = -9.0
    s.mix["brass"].gain = -4.0
    s.mix["choir"].gain = -5.0
    s.mix["keys"].gain = 1.0
    s.mix["bass"].gain = -8.0
    s.mix["drums"].gain = 0.0
    s.tilt = s.tilt + (("peak", 150, 2.0, 0.8), ("highshelf", 7000, 4.0, 0.7))
    m = M

    def theme(a, names, vel=0.85, until=None, gain=0.0, piano=True, brass=True):
        for k, name in enumerate(names):
            for beat, nm, beats in THEME[name]:
                t0 = a + (2 * k + beat) * BEAT
                if until is not None and t0 >= until - 1e-6:
                    return
                n0 = midi(nm)
                h = beats * BEAT * 0.95
                s.log.append((t0, h, n0, "melody"))
                s.mix["strings"].add(tonal.strings((n0, n0 - 12), round(h + 0.05, 3), q(vel), 0.02, 0.35, "marcato", 5, int(t0 * 8) % 5), t0, gain)
                if piano:
                    s.piano(t0, [n0, n0 - 12], vel * 0.9, h, gain=gain - 2, role="melody")
                if brass:
                    s.mix["brass"].add(tonal.brass((n0 - 12,), round(h, 3), q(vel), "stab", int(t0 * 8) % 5), t0, gain - 3)

    def ostinato(a, b, vel=0.7, gain=0.0, low=50, high=69, pat="XxxxXxxxXxxxXxxx", order=(0, 1, 2, 1)):
        """The engine: spiccato strings in sixteenths, each note doubled an octave up."""
        prev = None
        for t, v, k in s.hits(a, b, pat, 0.125, seed=21):
            nominal = a + k * 0.125
            name = s.chord(nominal + 1e-4)
            if not name:
                continue
            vc = voice(name, low, high, prev, 3)
            prev = vc
            n0 = vc[order[k % len(order)] % len(vc)]
            s.log.append((t, 0.1, n0, "harmony@" + str(round(nominal, 4))))
            s.mix["strings"].add(tonal.strings((n0, n0 + 12), 0.1, q(vel * v), 0.006, 0.06, "spiccato", 4, k % 3), t, gain + 3)

    def pulse(a, b, vel=0.6, gain=0.0, pat="x"):
        s.arp(a, b, "bass", "pluck", 0.125, (0, 1, 2, 1), 50, 65, 3, vel, gain - 6, bus="plucks", hold=0.1, pat=pat)

    def braam(t, ns, dur, gain=0.0):
        ns = tuple(notes(ns))
        s.log.extend((t, dur, n0, "harmony") for n0 in ns)
        s.mix["brass"].add(kit.braam(ns, round(dur, 2), int(t) % 3), t, gain - 4)

    def drums(a, b, g=0.0, kick=True):
        parts = dict(TAIKO)
        if kick:
            parts["kick:deep"] = "X.......X......."
            parts["snare"] = ("....X.......X...", -2.0)
        s.groove(a, b, parts, g)

    def low(a, b, g=0.0, vel=0.85):
        s.bassline(a, b, "X.......X.......", "round", vel=vel, gain=g, hold=0.9)
        s.sustain(a, b, "sub", gain=g - 4)

    # ---------------------------------------------------------------- once upon a time: a piano in a large room
    s.changes(0.0, [(4, "Dm9"), (4, "Bbmaj7")])
    s.sustain(0.0, m["press1"], "strings", 38, 50, 2, -2, 0.5, attack=1.6, release=1.0)
    s.sustain(0.6, m["press1"], "glass", 62, 81, 3, -4, attack=2.0, release=1.2, bright=0.4)
    for beat, nm, beats, v in ((1, "A5", 1, .45), (2, "E5", 1, .42), (3, "F5", 1, .45), (5, "D6", 1, .5), (6, "A5", 1, .45), (7, "C6", 1, .48)):
        s.piano(beat * BEAT, [midi(nm)], v, beats * BEAT * 2.2, gain=6, role="melody")
    s.kick(0.0, "deep", 0.6, -6)
    s.swell_into(m["press1"], 1.2, -4)

    # ---------------------------------------------------------------- the Home button: the engine starts
    P1, P2 = m["press1"], m["press2"]
    s.changes(P1, [(4, "Bbmaj7"), (2, "C")])
    s.impact(P1, 0.5, -6, crash=False)
    s.strike("taiko", "", P1, 0.7, -4)
    ostinato(P1, P2, 0.45, -3, pat="x.x.x.x.x.x.x.x.")
    s.sustain(P1, P2, "strings", 38, 53, 2, -3, 0.55, attack=0.8)
    s.piano(m["home"] + 0.5, notes("A5 D6 F6"), 0.5, 1.2, gain=-1, role="melody")
    for i in range(10):
        s.note("mallet", "celesta", m["home"] + 1.0 + 0.125 * i, notes("F5 A5 C6 D6 F6 A6 C7 D7 F7 A7")[i], 0.4 + 0.03 * i, 0.4, -4, pan=-0.6 + 0.13 * i)
    s.groove(P2 - 0.5, P2, {"tom": ("xxxx", -2.0, 120)}, -6)

    # ---------------------------------------------------------------- the build
    s.changes(P2, [(4, "Dm"), (2, "Bb"), (2, "Gm"), (2, "A")])
    braam(P2, "D2 A2 D3", 1.6, -2)
    s.impact(P2, 0.8, -3)
    ostinato(P2, m["flash"], 0.6, -1)
    pulse(P2 + 1.0, m["flash"], 0.55)
    s.sustain(P2, m["flash"], "strings", 46, 72, 4, -4, 0.7, attack=2.0, release=0.4)
    s.groove(P2 + 2.0, m["flash"] - 0.25, {"taiko": ("X.......X.......", -2.0), "tom": ("....x.......x.x.", -6.0, 100)}, -2)
    s.rise(m["morph"], m["flash"], -1, seed=1)
    s.fill(m["flash"] - 2.0, m["flash"], "tom", -16, 0)
    s.swell_into(m["flash"], 1.2, 0)

    # ---------------------------------------------------------------- a place: the fanfare
    F0 = m["flash"]
    s.changes(F0, [(2, "Dm"), (2, "Bb"), (2, "Gm"), (2, "A")])
    s.impact(F0, 1.4)
    braam(F0, "D2 A2 D3 F3", 1.0, 0)
    drums(F0, m["bench"])
    low(F0, m["bench"])
    theme(F0, ["Dm", "Bb", "Gm", "A"], 0.88)
    ostinato(F0, m["bench"], 0.7, -2)
    s.sustain(F0, m["bench"], "choir", 57, 76, 4, -4, 0.7, attack=0.3, release=0.6, vowel="o")
    for t0 in (F0, F0 + 1.0, F0 + 2.0, F0 + 3.0):
        s.brass_hit(t0, voice(s.chord(t0 + 1e-4), 50, 67, None, 3), 0.25, 0.9, -3)

    # ---------------------------------------------------------------- the workbench
    B0 = m["bench"]
    s.changes(B0, [(4, "Dm"), (4, "Bbmaj7"), (3, "F"), (2, "C")])
    ostinato(B0, m["implode"], 0.55, -3)
    pulse(B0, m["implode"], 0.5, -1)
    s.groove(B0, m["implode"] - 0.5, {"taiko": ("X.......X.......", -6.0), "tom": ("......x.......x.", -8.0, 110), "rim": "....x.......x..."}, -2)
    s.sustain(B0, m["implode"], "strings", 38, 53, 2, -4, 0.6, attack=0.5)
    for i, ch in enumerate(("F5 A5 D6", "A5 D6 F6", "D6 F6 A6", "F6 A6 D7")):  # four layers part
        t0 = m["explode"] + 0.5 + 0.25 * i
        s.piano(t0, notes(ch), 0.7 + 0.05 * i, 0.3)
        s.strings_hit(t0, notes(ch), 0.2, 0.8, -6)
        s.strike("taiko", "", t0, 0.85, -4, i)
    s.reverse(kit.cymbal("crash", 1.2, 4), m["implode"] + 0.9, "drums", -12)
    s.kick(m["implode"] + 0.9, "deep", 0.9, -2)

    # ---------------------------------------------------------------- the launch pad
    L0 = m["launch"]
    s.changes(L0, [(4, "Dm"), (2, "Bb"), (1, "C")])
    pulse(L0, m["warp"], 0.45, -3)
    ostinato(L0, m["fly"], 0.4, -6, pat="x.x.x.x.x.x.x.x.")
    s.groove(L0, m["warp"], {"rim": "x.x.x.x.x.x.x.x.", "kick:deep": "X.......X......."}, -6)
    for i, nn in enumerate(notes("D5 F5 A5 C6 D6 F6 A6 C7 D7")):
        s.piano(m["fly"] + 0.03 + i * 0.045, [nn], 0.5 + 0.05 * i, 0.15, gain=-2, role="melody")
    s.fill(m["warp"], m["slit"], "tom", -16, -4)
    s.rise(m["warp"] - 0.05, m["slit"], -2, 500, 11000, seed=2)

    # ---------------------------------------------------------------- the narrow way; the door
    S0, O0 = m["slit"], m["open"]
    s.changes(S0, [(2, "Dm9")])
    s.piano(S0, notes("A5"), 0.45, 1.0, role="melody")
    s.piano(S0 + 0.5, notes("E5"), 0.4, 0.6, role="melody")
    s.kick(S0, "deep", 0.7, -5)
    s.sustain(S0, O0, "strings", 38, 50, 2, -4, 0.5, attack=0.3)
    s.swell_into(O0, 0.9, 1)
    s.changes(O0, [(4, "Dm9"), (2, "Bb")])
    s.impact(O0, 1.0)
    braam(O0, "D2 A2 D3", 1.4, -2)
    for i, nn in enumerate(notes("D4 E4 F4 A4 C5 D5 E5 F5 A5 C6 D6 E6")):
        s.note("pluck", "harp", O0 + 0.03 * i, nn, 0.7, 0.9, -2, pan=-0.8 + 0.145 * i)
    ostinato(O0, m["rise"], 0.65, -1)
    pulse(O0, m["rise"], 0.55)
    s.groove(O0, m["rise"] - 0.5, {"taiko": ("X.......X...x...", -3.0), "kick:deep": "X.......X.......", "rim": "....x.......x..."}, -2)
    s.sustain(O0, m["rise"], "strings", 46, 72, 4, -5, 0.65, attack=0.5)

    # ---------------------------------------------------------------- the wave
    R0, J0 = m["rise"], m["jump"]
    s.changes(R0, [(2, "Bbmaj7"), (2, "C")])
    s.impact(R0, 0.9)
    s.strings_hit(R0, notes("D4 F4 A4 Bb4"), 0.4, 0.9, -3)
    ostinato(R0, J0 - 0.125, 0.75, 0, pat="XxxxXxxxXxxxXxxx")
    s.sustain(R0, J0, "strings", 48, 76, 4, -2, 0.85, attack=1.7, release=0.2)
    s.sustain(R0, J0, "choir", 60, 79, 4, -6, 0.7, attack=1.6, release=0.2, vowel="a")
    s.groove(R0 + 0.5, J0 - 0.125, {"taiko": "X...x...x.x.xxxx", "tom": ("..x...x.xxxxxxxx", -4.0, 120)}, -4)
    s.rise(R0 + 0.3, J0, 0, 300, 12000, seed=4)
    s.swell_into(J0, 1.0, 2)

    # ---------------------------------------------------------------- out into the world: the fanfare, biggest
    s.changes(J0, [(2, "Dm"), (2, "Bb"), (2, "F"), (2, "C")])
    s.impact(J0, 1.8, 1)
    braam(J0, "D2 A2 D3 F3", 1.2, 1)
    drums(J0, m["back"] - 0.25, 1)
    low(J0, m["back"], 1)
    theme(J0, ["Dm", "Bb", "F", "C"], 0.95, gain=1)
    ostinato(J0, m["back"], 0.75, -1)
    s.sustain(J0, m["back"], "choir", 57, 79, 5, -2, 0.8, attack=0.25, release=0.5, vowel="a")
    for t0 in (J0, J0 + 1.0, J0 + 2.0, J0 + 3.0):
        s.brass_hit(t0, voice(s.chord(t0 + 1e-4), 50, 67, None, 3), 0.3, 0.95, -2)

    # ---------------------------------------------------------------- the stage: hush, then the build to the lights
    K0 = m["back"]
    s.changes(K0, [(4, "Dm"), (4, "Bbmaj7"), (4, "F"), (2, "C")])
    s.sustain(K0, m["sheet"], "strings", 38, 53, 2, -3, 0.55, attack=0.3)
    for beat, nm in ((0.5, "A5"), (1.5, "F5"), (2.5, "D6"), (3.5, "A5")):
        s.piano(K0 + beat * BEAT, [midi(nm)], 0.45, 0.8, gain=0, role="melody")
    for i, b0 in enumerate((m["burst"], m["burst"] + 0.35, m["burst"] + 0.7)):  # the light fires: brass
        s.brass_hit(b0, notes(("A4 D5 F5", "A4 D5 F5", "D5 F5 A5")[i]), 0.15, 0.75 + 0.08 * i, -3)
        s.strike("taiko", "", b0, 0.7 + 0.1 * i, -5, i)
    ostinato(m["sheet"], m["show"], 0.5, -3)
    pulse(m["sheet"], m["show"], 0.5)
    s.groove(m["lasers"], m["show"] - 0.5, {"taiko": ("X.......X.......", -2.0), "tom": ("..x...x...x...x.", -6.0, 105), "kick:deep": "X.......X......."}, -2)
    s.sustain(m["lasers"], m["show"], "strings", 46, 72, 4, -4, 0.7, attack=1.5)
    s.fill(m["show"] - 1.0, m["show"], "tom", -16, -2)
    s.rise(m["show"] - 1.5, m["show"], -3, seed=5)
    s.swell_into(m["show"], 0.6, -1)

    # ---------------------------------------------------------------- the lights come up
    H0 = m["show"]
    s.changes(H0, [(2, "F"), (2, "C"), (2, "Bb")])
    s.impact(H0, 0.9, -1)
    drums(H0, m["console"])
    low(H0, m["console"])
    theme(H0, ["F", "C", "Bb"], 0.88)
    ostinato(H0, m["console"], 0.7, -2)

    # ---------------------------------------------------------------- the console
    C0 = m["console"]
    s.changes(C0, [(4, "Bb"), (4, "F"), (4, "C")])
    ostinato(C0, m["pillars"] - 0.5, 0.55, -3)
    pulse(C0, m["pillars"] - 0.5, 0.5, -1)
    s.groove(C0, m["pillars"] - 1.0, {"taiko": ("X.......X.......", -6.0), "rim": "....x.......x...", "kick:deep": "X.......X......."}, -3)
    s.sustain(C0, m["pillars"], "strings", 38, 53, 2, -4, 0.6)
    penta = notes("F5 G5 A5 C6 D6 F6 G6 A6 C7")
    for i, end in enumerate((84, 22, 74, 92, 72, 96)):
        s.note("mallet", "celesta", m["knobs"] + 0.5 * i + 0.85, penta[min(8, int(end / 100 * 9))], 0.65, 0.6, -1, pan=-0.4)
    s.fill(m["pillars"] - 1.0, m["pillars"], "tom", -18, -2)
    s.swell_into(m["pillars"], 1.0)

    # ---------------------------------------------------------------- four places, one line, one point
    s.changes(m["pillars"], [(1, "Dm"), (1, "Bb"), (1, "F"), (3, "C")])
    for k, (ch, lo) in enumerate((("D4 A4 D5 F5", "D2 A2 D3"), ("D4 F4 Bb4 D5", "Bb1 F2 Bb2"), ("C4 F4 A4 C5", "F2 C3 F3"), ("C4 E4 G4 C5", "C2 G2 C3"))):
        t0 = m["pillars"] + 0.5 * k
        s.impact(t0, 0.7 + 0.15 * k, -3, crash=k == 0)
        braam(t0, lo, 0.42, -3)
        s.strings_hit(t0, notes(ch), 0.42, 0.95, -2)
        s.piano(t0, notes(ch) + [notes(lo)[0]], 0.85, 0.45)
        s.strike("taiko", "", t0, 1.0, -1, k)
    s.groove(m["pillars"] + 2.0, m["converge"], {"taiko": ("X.......X.......", -3.0)}, -2)
    s.changes(m["converge"], [(2, "Bb"), (3, "Csus4"), (2, "C")])
    ostinato(m["converge"], m["lock"] - 0.125, 0.6, -2)
    s.sustain(m["converge"], m["lock"], "strings", 48, 76, 4, -3, 0.85, attack=2.5, release=0.2)
    s.sustain(m["point"], m["lock"], "choir", 60, 79, 4, -5, 0.75, attack=1.8, release=0.2, vowel="a")
    s.rise(m["converge"], m["point"], -4, seed=6)
    s.kick(m["point"], "deep", 1.0, -1)
    s.groove(m["point"], m["lock"] - 0.125, {"taiko": "X.......X...x.x.", "tom": ("....x.......xxxx", -4.0, 115)}, -3)
    s.fill(m["lock"] - 1.5, m["lock"] - 0.125, "tom", -14, 1)
    s.rise(m["point"], m["lock"], 0, 260, 12000, seed=7)
    s.swell_into(m["lock"], 1.0, 2)

    # ---------------------------------------------------------------- the name
    Z0 = m["lock"]
    s.changes(Z0, [(2, "Dm"), (2, "Bb"), (2, "F"), (1, "C")])
    s.impact(Z0, 1.9, 2)
    braam(Z0, "D2 A2 D3 F3", 1.2, 1)
    drums(Z0, m["dark"], 1)
    low(Z0, m["dark"], 1)
    theme(Z0, ["Dm", "Bb", "F", "C"], 0.95, until=m["dark"], gain=1)
    ostinato(Z0, m["dark"], 0.75, -1)
    s.sustain(Z0, m["dark"], "choir", 57, 79, 5, -2, 0.85, attack=0.2, release=0.3, vowel="a")
    for t0 in (Z0, Z0 + 1.0, Z0 + 2.0, Z0 + 3.0):
        s.brass_hit(t0, voice(s.chord(t0 + 1e-4), 50, 67, None, 3), 0.3, 0.95, -2)

    # ---------------------------------------------------------------- the residents: a music box in the dark
    U0 = m["cut"]
    s.changes(U0, [(4, "F")])
    s.note("mallet", "celesta", U0, midi("F5"), 0.5, 1.0, 0)
    s.note("mallet", "celesta", U0 + 0.5, midi("A5"), 0.5, 1.0, 0)
    s.note("mallet", "celesta", U0 + 1.0, midi("C6"), 0.55, 1.0, 0)
    s.sustain(U0, m["swarm"], "strings", 41, 53, 2, -5, 0.45, attack=0.8)
    S1 = m["swarm"]
    s.changes(S1, [(4, "F"), (4, "Dm"), (4, "Bb"), (4, "C"), (4, "F"), (4, "C")])
    from .fusion import TUNE
    for beat, nm, beats in TUNE:  # the residents' tune: celesta, a harp an octave down
        s.note("mallet", "celesta", S1 + beat * BEAT, midi(nm), 0.7, beats * BEAT, 0, pan=0.12)
        s.note("pluck", "harp", S1 + beat * BEAT, midi(nm) - 12, 0.5, 0.4, -6, pan=-0.12)
    s.arp(S1, GARDEN - 0.5, "pluck", "pizz", 0.25, (0, 1, 2, 1), 53, 69, 3, 0.5, -4)
    s.sustain(S1, GARDEN, "strings", 41, 60, 3, -6, 0.5, attack=0.6)
    s.groove(S1 + 4.0, GARDEN - 1.0, {"taiko": ("X.......x.......", -10.0), "rim": ("....x.......x...", -2.0)}, -3)

    # ---------------------------------------------------------------- the back garden
    s.changes(GARDEN, [(4, "Bbmaj7"), (2, "F"), (2, "C")])
    s.comp(GARDEN, m["device"] - 0.5, "x.o.x.o.", 55, 74, 4, 0.65, 0.6, gain=7, order=(0, 2, 1, 3), step=0.25)
    s.sustain(GARDEN, m["device"], "strings", 46, 72, 4, -5, 0.55, attack=1.2, release=0.5)
    s.fill(m["device"] - 1.2, m["device"], "tom", -20, -2)
    s.rise(m["device"] - 1.2, m["device"], -2, seed=8)
    s.swell_into(m["device"], 1.0)

    # ---------------------------------------------------------------- made for one screen
    D0 = m["device"]
    s.changes(D0, [(4, "Dm"), (4, "Bbmaj7"), (2, "F"), (2, "C"), (2, "Dm"), (2, "Bb")])
    s.impact(D0, 1.3)
    braam(D0, "D2 A2 D3", 1.2, 0)
    drums(D0, m["walls"] - 0.125)
    low(D0, m["walls"])
    ostinato(D0, m["walls"], 0.7, -2)
    for i, t0 in enumerate(SPECS):  # the numbers slam down
        s.impact(t0, 0.55, -5, crash=False)
        s.brass_hit(t0, notes(("D4 F4 A4", "F4 A4 D5", "D4 F4 A4", "F4 A4 D5")[i]), 0.2, 0.95, -2)
        s.strike("taiko", "", t0, 0.95, -2, i)
    theme(D0 + 4.0, ["F", "C", "Dm", "Bb"], 0.88)

    # ---------------------------------------------------------------- three wallpapers
    W0 = m["walls"]
    s.changes(W0, [(2, "F"), (2, "C/E"), (2, "Dm")])
    for i, t0 in enumerate(WALL["calls"]):
        s.impact(t0, 0.8 + 0.1 * i, -2, crash=i == 0)
        s.brass_hit(t0, notes(("F4 A4 C5", "E4 G4 C5", "D4 F4 A4")[i]), 0.35, 0.95, -1)
        s.strings_hit(t0, notes(("F4 A4 C5 F5", "E4 G4 C5 E5", "D4 F4 A4 D5")[i]), 0.45, 0.95, -2)
        s.strike("taiko", "", t0, 1.0, -1, i)
    drums(W0, WALL["float"], 0, kick=False)
    low(W0, WALL["float"])
    ostinato(W0, WALL["float"], 0.7, -2)

    # glass in the air: the engine idles, celesta over it
    G0, G1 = WALL["float"], W0 + 5.5
    s.changes(G0, [(2, "Bbmaj7"), (2, "Gm9"), (1, "Csus4")])
    s.arp(G0 + 0.25, G1, "mallet", "celesta", 0.125, (0, 2, 1, 3, 2, 4, 3, 1), 72, 93, 4, 0.5, -1, "mallets")
    ostinato(G0, G1, 0.4, -6, pat="x.x.x.x.x.x.x.x.")
    s.sustain(G0, G1, "glass", 62, 81, 3, -4, attack=0.6, release=0.5, bright=0.7)
    s.sustain(G0, G1, "strings", 38, 53, 2, -5, 0.5, attack=0.5)

    # the device rises; the cards land; the picker; a tap
    s.changes(G1, [(2, "C"), (3, "F"), (0.5, "F")])
    s.rise(G1 - 0.6, WALL["risen"], -8, 200, 4000, seed=12)
    for i, t0 in enumerate(WALL["land"]):
        s.piano(t0, [midi(("G5", "C6", "F6")[i])], 0.62, 0.6, gain=0, role="melody")
        s.strike("taiko", "", t0, 0.5 + 0.15 * i, -8, i)
    s.kick(WALL["risen"], "deep", 0.8, -4)
    pulse(WALL["land"][2], WALL["open"], 0.45, -2)
    s.sustain(G1, WALL["open"], "strings", 46, 69, 4, -6, 0.5, attack=0.5)
    s.piano(WALL["pick"], notes("C6 F6"), 0.55, 0.7, gain=-1, role="melody")

    # chosen: it opens, and night falls
    s.changes(WALL["open"], [(3, "Gm9")])
    s.impact(WALL["open"], 0.6, -6, crash=False)
    braam(WALL["open"], "G1 D2 G2", 1.2, -6)
    s.sustain(WALL["open"], m["tag"], "strings", 43, 70, 5, -3, 0.75, attack=0.25, release=1.0)
    s.piano(WALL["fall"], notes("D6"), 0.4, 0.9, role="melody")
    s.piano(WALL["fall"] + 0.375, notes("A5"), 0.36, 0.9, role="melody")

    # ---------------------------------------------------------------- launch from here; into D major
    T0, F2 = m["tag"], m["flash2"]
    s.changes(T0, [(2, "Bb"), (2, "A")])
    ostinato(T0, F2 - 0.125, 0.75, 0)
    s.sustain(T0, F2, "strings", 48, 76, 4, -2, 0.85, attack=1.6, release=0.2)
    s.sustain(T0, F2, "choir", 60, 79, 4, -5, 0.75, attack=1.5, release=0.2, vowel="a")
    s.groove(T0 + 0.5, F2 - 0.125, {"taiko": "X...x...x.x.xxxx", "tom": ("..x...x.xxxxxxxx", -4.0, 120)}, -4)
    braam(T0 + 1.0, "A1 E2 A2", 0.95, -4)
    s.rise(T0 + 0.4, F2, 0, 300, 12000, seed=9)
    s.swell_into(F2, 1.0, 2)

    s.changes(F2, [(2, "D"), (2, "A/C#"), (2, "Bm"), (2, "G")])
    s.impact(F2, 2.0, 2)
    braam(F2, "D2 A2 D3 F#3", 1.2, 1)
    drums(F2, F2 + 4.0, 1)
    low(F2, F2 + 4.0, 1)
    theme(F2, ["D", "A/C#", "Bm", "G"], 0.95, gain=1)
    ostinato(F2, F2 + 4.0, 0.75, -1)
    s.sustain(F2, F2 + 4.0, "choir", 57, 79, 5, -2, 0.85, attack=0.2, release=0.5, vowel="a")
    for t0 in (F2, F2 + 1.0, F2 + 2.0, F2 + 3.0):
        s.brass_hit(t0, voice(s.chord(t0 + 1e-4), 50, 67, None, 3), 0.3, 0.95, -2)

    end = F2 + 4.0
    s.changes(end, [(8, "Dadd9")])
    s.impact(end, 1.6)
    s.strike("taiko", "", end, 1.0, 0)
    tail = m["end"] - end
    s.piano(end, notes("D2 A2 D3 F#3 A3 E4 F#4 A4 D5"), 0.85, tail, spread=0.012)
    s.sustain(end, m["end"], "strings", 38, 76, 6, -2, 0.8, attack=0.05, release=1.4)
    s.sustain(end, m["end"], "choir", 57, 79, 5, -3, 0.75, attack=0.1, release=1.4, vowel="a")
    braam(end, "D1 A1 D2", tail, -4)
    for i, nn in enumerate(notes("D6 F#6 A6 D7")):
        s.note("mallet", "celesta", end + 0.3 * i, nn, 0.5, 1.2, -3, pan=-0.3 + 0.2 * i)
    return s
