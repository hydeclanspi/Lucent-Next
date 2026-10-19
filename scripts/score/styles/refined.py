"""Refined: the film's own score, played again.

The launch score as it stands: its chords on the bar lines, the rolling bass, the arpeggio, the seven-saw
chords and their stabs, the hook on a synth lead, the drum grooves from a ticking clock to the full kit,
scene for scene. Played on the new instruments, mixed again, and with the dynamics written in: the
grooves thin out where the film is quiet, and the desk follows the scenes. F major and D minor, lifting
to D major at the end.
"""
import numpy as np

from .. import tonal
from ..clock import BEAT, GARDEN, M, SR, WALL
from ..song import Song, q
from ..theory import midi, notes, voice
from .common import SPECS
from .fusion import CELL, TUNE

GROOVES = {
    "tick": {"hat": ("Xooo" * 4, -6.0)},
    "heart": {"kick:soft": ("X...X...X...X...", -3.0), "hat": ("Xooo" * 4, -6.0)},
    "half": {"kick": "X.........X.....", "clap": ("........X.......", -2.0), "hat": ("ooxo" * 4, -4.0)},
    "drive": {"kick": "X...X...X...X...", "clap": "....X.......X...", "snare": ("....x.......x...", -6.0), "ohat": "..x...x...x...x.",
              "hat": ("xo.oxo.oxo.oxo.o", -2.0)},
    "full": {"kick": "X...X...X...X...", "clap": "....X.......X...", "snare": ("....x.......x...", -6.0), "ohat": "..x...x...x...x.",
             "hat": ("xo.oxo.oxo.oxo.o", -2.0), "rim": ("...x..x....x..x.", -5.0), "tamb": ("x-x-x-x-x-x-x-x-", -4.0)},
    "bounce": {"kick": "X.....x.x.......", "clap": ("....X.......X...", -2.0), "shaker": ("ooxo" * 4, -3.0), "rim": (".......x.......x", -5.0)},
    "soft": {"kick:soft": "X...............", "shaker": ("o.x.o.x.o.x.o.x.", -4.0)},
}
BASS = {  # pattern, which steps move to the octave, how long each note holds, octave
    "roll": ("Xxxx", "..O.", 0.115, 0), "off": ("..x.", None, 0.21, 1),
    "bounce": ("x..x..x.x..x..x.", "......O.......O.", 0.17, 0), "pulse": ("x.x.", None, 0.2, 0),
}
ARP = (0, 2, 1, 3, 2, 4, 3, 5)


def compose():
    s = Song("现版精修 · Refined", "F4", "major", fader_depth=3.2,
             bell=lambda m, v=0.6: tonal.mallet(int(m), "glock", round(v, 2)),
             pluck=lambda m, v=0.6: tonal.bass(int(m), 0.3, "pluck", round(v, 2)))
    s.mix["pads"].gain = -7.0
    s.mix["plucks"].gain = -13.0
    s.mix["lead"].gain = -7.0
    s.mix["brass"].gain = 0.0      # the stabs
    s.mix["bass"].gain = -4.0
    s.mix["perc"].gain = 4.0
    s.tilt = s.tilt + (("peak", 250, 2.0, 0.8), ("highshelf", 6000, 3.0, 0.7))
    m = M

    def groove(a, b, style, g=0.0):
        s.groove(a, b, GROOVES[style], g)

    def bassline(a, b, style, g=0.0, vel=0.8):
        pat, fifths, hold, octave = BASS[style]
        s.bassline(a, b, pat, "pluck", octave, vel, g, hold, fifths=fifths)

    def low(a, b, g=0.0):
        s.sustain(a, b, "sub", gain=g)

    def pads(a, b, g=0.0, cutoff=7000.0, attack=0.012):
        s.sustain(a, b, "super", 50, 72, 5, g, attack=attack, release=0.3, bright=(cutoff - 600) / 9000)

    def stab(t, ns, g=0.0, cutoff=6500.0):
        ns = tuple(int(x) for x in ns)
        s.log.extend((t, 0.2, n0, "harmony") for n0 in ns)
        x = tonal.pad(ns, 0.26, "super", 0.002, 0.06, (cutoff - 600) / 9000, int(t * 10) % 5)
        s.mix["brass"].add(x * np.exp(-np.arange(x.shape[1]) / SR / 0.1), t, g)

    def stabs(a, b, where, g=0.0, octave=1):
        """Chords struck on the off-beats of a two-bar figure (positions in sixteenths)."""
        k, prev = 0, None
        while a + k * 0.125 < b - 1e-6:
            t = a + k * 0.125
            name = s.chord(t + 1e-4)
            if k % 32 in where and name:
                prev = voice(name, 53 + 12 * octave, 69 + 12 * octave, prev, 3)
                stab(t, prev, g)
            k += 1

    def arpeggio(a, b, g=0.0, octave=0, vel=0.75, ramp=None):
        prev = None
        for t, v, k in s.hits(a, b, "x", 0.125, seed=31):
            nominal = a + k * 0.125
            name = s.chord(nominal + 1e-4)
            if not name:
                continue
            vc = voice(name, 62 + 12 * octave, 74 + 12 * octave, prev, 3)
            prev = vc
            n0 = vc[ARP[k % 8] % 3] + 12 * (ARP[k % 8] // 3)
            lvl = g + (0.0 if k % 4 == 0 else -2.5) + (ramp((t - a) / (b - a)) if ramp else 0.0)
            s.note("bass", "pluck", t, n0, vel, 0.13, lvl, "plucks", pan=0.32 * np.sin(k * 0.77), role="harmony@" + str(round(nominal, 4)))

    def hook(a, names, vel=0.85, until=None, gain=0.0, transpose=0):
        for k, name in enumerate(names):
            for beat, nm, beats in CELL[name]:
                t0 = a + (2 * k + beat) * BEAT
                if until is not None and t0 >= until - 1e-6:
                    return
                n0 = midi(nm) + transpose
                h = beats * BEAT * 0.9
                if until is not None:
                    h = min(h, until - t0 - 0.02)
                s.log.append((t0, h, n0, "melody"))
                s.mix["lead"].add(tonal.lead(n0, round(h, 3), "saw", q(vel)), t0, gain)

    def kick_ramp(a, b, g=0.0):
        t = a
        while t < b - 0.125 - 1e-6:  # the kick doubles, then doubles again
            s.kick(t, "pop", 0.95, g - 1)
            t += 0.25 if t < b - 0.5 else 0.125

    # ---------------------------------------------------------------- once upon a time: a pulse that quickens
    s.changes(0.0, [(8, "Dm9")])
    s.log.extend((0.0, m["press1"], n0, "harmony") for n0 in (38, 45))  # a drone on D and A
    s.mix["pads"].add(tonal.pad((38, 45), m["press1"], "warm", 1.2, 0.3, 0.08), 0.0, -2)
    low(0.0, m["press1"], -2)
    groove(0.5, 2.0, "tick", -2)
    groove(2.0, m["press1"], "heart", -4)
    arpeggio(m["draw0"] - 0.1, m["press1"], -6, 0, 0.6, ramp=lambda p: -10 * (1 - p))
    for i, nn in enumerate(notes("D4 A4 C5 E5 F5")):  # the ring closes
        s.note("bass", "pluck", m["draw1"] + 0.012 * i, nn, 0.7, 0.6, -6, "plucks", pan=-0.4 + 0.2 * i)
    s.fill(m["press1"] - 1.0, m["press1"], "snare", -26, -14)
    s.swell_into(m["press1"], 0.75, -4)

    # ---------------------------------------------------------------- the Home button
    P1, P2 = m["press1"], m["press2"]
    s.changes(P1, [(4, "Bbmaj7"), (2, "C")])
    s.impact(P1, 0.6, -3, crash=False)
    groove(P1, P2, "half", -1)
    bassline(P1, P2, "roll", -3, 0.6)
    low(P1, P2, -4)
    pads(P1, P2, -6, 2600)
    stab(m["home"] + 0.5, notes("A4 D5 F5"), 0)  # the name appears
    prev = None
    for i in range(10):  # a bead of light runs the length of the arc
        tb = m["home"] + 1.0 + 0.125 * i
        prev = voice(s.chord(tb), 74, 86, prev, 3)
        s.note("bass", "pluck", tb, prev[ARP[i % 8] % 3] + 12 * (ARP[i % 8] // 3), 0.6 + 0.03 * i, 0.15, -2 + 0.6 * i, "plucks", pan=-0.7 + 0.16 * i)
    s.fill(P2 - 0.5, P2, "snare", -22, -12)

    # ---------------------------------------------------------------- pressed again: the build to the flash
    s.changes(P2, [(4, "Dm"), (2, "Bb"), (2, "C"), (2, "Csus4")])
    s.impact(P2, 1.0)
    groove(P2, m["flash"] - 0.5, "drive", -1)
    bassline(P2, m["flash"] - 0.5, "roll", -1)
    low(P2, m["flash"] - 0.5, -2)
    arpeggio(P2, m["flash"] - 0.5, -1)
    pads(P2, m["flash"], -3, 4200)
    stabs(P2, m["flash"] - 1, (3, 6, 10, 19, 22, 26), -2)
    s.rise(m["morph"], m["flash"], -1, 240, 9000, seed=15)
    s.fill(m["flash"] - 2.0, m["flash"], "snare", -20, -4)
    s.swell_into(m["flash"], 1.0)

    # ---------------------------------------------------------------- a flash into the light: a place
    F0 = m["flash"]
    s.changes(F0, [(2, "F"), (2, "C"), (2, "Dm"), (2, "Bb")])
    s.impact(F0, 1.4)
    groove(F0, m["bench"], "full", 0)
    bassline(F0, m["bench"], "off", 0)
    low(F0, m["bench"], 0)
    pads(F0, m["bench"], 0, 8000)
    arpeggio(F0, m["bench"], -3, 1, 0.8)
    hook(F0, ["F", "C", "Dm", "Bb"], 0.9)

    # ---------------------------------------------------------------- the workbench
    B0 = m["bench"]
    s.changes(B0, [(4, "Dm"), (4, "Bb"), (3, "F"), (2, "C")])
    groove(B0, m["implode"] + 0.5, "half", -2)
    bassline(B0, m["implode"] + 0.5, "roll", -2)
    low(B0, m["implode"] + 0.5, -3)
    arpeggio(B0, m["implode"] + 0.5, 0, 0, 0.7)
    pads(B0, m["launch"], -6, 3200)
    for i in range(4):  # four layers part
        t0 = m["explode"] + 0.5 + 0.25 * i
        stab(t0, voice("Bb", 65 + 2 * (i % 2), 77 + 2 * (i % 2), None, 3), -2 + i)
        s.strike("tom", "", t0, 0.9, -4, i, 98 + 22 * i)
    s.kick(m["implode"] + 0.9, "pop", 0.9, -2)

    # ---------------------------------------------------------------- the launch pad
    L0 = m["launch"]
    s.changes(L0, [(4, "Dm"), (2, "Bb"), (1, "C")])
    groove(L0, m["warp"], "half", -1)
    bassline(L0, m["warp"], "roll", -1)
    low(L0, m["warp"], -2)
    arpeggio(L0, m["warp"], 0, 0, 0.75)
    stabs(L0, m["fly"], (3, 6, 10, 19, 22, 26), -3)
    s.fill(m["warp"], m["slit"], "snare", -20, -8, kicks=True)
    s.rise(m["warp"] - 0.05, m["slit"], -2, 500, 11000, seed=27)

    # ---------------------------------------------------------------- the narrow way; a door edged in every colour
    S0, O0 = m["slit"], m["open"]
    s.changes(S0, [(6, "Dm9"), (2, "Bb")])
    for b0 in (S0, S0 + 0.5):
        s.kick(b0, "soft", 0.7, -4)
    s.sustain(S0, O0, "air", 62, 81, 3, -6, attack=0.3, release=0.3, bright=0.5)
    s.swell_into(O0, 0.9, 2)
    s.impact(O0, 1.0)
    for i, nn in enumerate(notes("D4 E4 F4 A4 C5 D5 E5 F5 A5 C6 D6 E6")):  # every colour
        s.note("bass", "pluck", O0 + 0.03 * i, nn, 0.75, 0.4, -2 + 0.4 * i, "plucks", pan=-0.8 + 0.145 * i)
    pads(O0, m["rise"], -2, 6000)
    groove(O0, m["rise"] - 0.5, "drive", 0)
    bassline(O0, m["rise"], "roll", 0)
    low(O0, m["rise"], -2)
    arpeggio(O0, m["rise"], -2, 1, 0.75)
    s.fill(m["rise"] - 0.5, m["rise"], "snare", -20, -10)
    s.swell_into(m["rise"], 0.5, -2)

    # ---------------------------------------------------------------- the wave
    R0, J0 = m["rise"], m["jump"]
    s.changes(R0, [(2, "Bbmaj7"), (2, "C")])
    s.impact(R0, 0.9)
    stab(R0, notes("A4 D5 F5 Bb5"), 2)
    groove(R0, R0 + 1.0, "drive", 0)
    bassline(R0, J0 - 0.5, "roll", 0, 0.9)
    low(R0, J0 - 0.125, -1)
    pads(R0, J0, -1, 9000)
    kick_ramp(R0 + 1.5, J0)
    s.fill(R0 + 1.0, J0 - 0.125, "snare", -18, -2)
    s.rise(R0 + 0.3, J0, 0, 300, 12000, seed=521)
    s.swell_into(J0, 1.0, 2)

    # ---------------------------------------------------------------- the jump: a tunnel of a thousand windows
    s.changes(J0, [(2, "Dm"), (2, "Bb"), (2, "F"), (2, "C")])
    s.impact(J0, 1.7, 1)
    groove(J0, m["back"], "full", 1)
    bassline(J0, m["back"], "off", 1)
    low(J0, m["back"], 0)
    pads(J0, m["back"], 1, 9500)
    arpeggio(J0, m["back"], -3, 1, 0.85)
    stabs(J0, m["back"], (3, 10, 14, 19, 26, 30), -3, 2)
    hook(J0, ["Dm", "Bb", "F", "C"], 0.95, gain=1)
    for i in range(4):  # a fill out of the tunnel
        s.strike("tom", "", m["back"] - 0.5 + 0.125 * i, 0.95, -1 + i, i, 150 - 20 * i)

    # ---------------------------------------------------------------- the stage: hush, the lasers, the lights come up
    K0 = m["back"]
    s.changes(K0, [(4, "Dm"), (4, "Bb"), (4, "F"), (4, "C"), (2, "Dm"), (2, "Bb")])
    groove(K0, m["sheet"], "heart", -2)
    groove(m["sheet"], m["show"], "drive", -2)
    groove(m["show"], m["console"], "full", 0)
    bassline(K0 + 2.0, m["console"], "roll", -1)
    low(K0, m["console"], -2)
    arpeggio(K0, m["lasers"], 0, 0, 0.7)
    arpeggio(m["lasers"], m["console"], -1, 1, 0.8)
    pads(K0, m["show"], -7, 3400)
    pads(m["show"], m["console"], 0, 8000)
    stabs(m["show"], m["console"], (3, 6, 10, 19, 22, 26), -1)
    s.swell_into(m["show"], 0.5, -3)
    s.impact(m["show"], 0.7, -2)

    # ---------------------------------------------------------------- the console
    C0 = m["console"]
    s.changes(C0, [(4, "Bb"), (4, "F"), (4, "C")])
    groove(C0, m["pillars"] - 1.0, "half", -1)
    bassline(C0, m["pillars"] - 0.5, "roll", -1.5)
    low(C0, m["pillars"] - 0.5, -2)
    pads(C0, m["pillars"], -4, 5000)
    arpeggio(C0, m["pillars"] - 0.5, 0, 1, 0.7)
    s.fill(m["pillars"] - 1.0, m["pillars"], "snare", -22, -6, kicks=True)
    s.swell_into(m["pillars"], 1.0)

    # ---------------------------------------------------------------- four places: four pillars, four chords; one point
    s.changes(m["pillars"], [(1, "Dm"), (1, "Bb"), (1, "F"), (3, "C")])
    for k in range(4):
        t0 = m["pillars"] + 0.5 * k
        name = s.chord(t0 + 1e-4)
        s.impact(t0, 0.6 + 0.15 * k, -2, crash=k == 0)
        vc = voice(name, 50, 72, None, 5)
        s.log.extend((t0, 0.45, n0, "harmony") for n0 in vc)
        s.mix["pads"].add(tonal.pad(tuple(vc), 0.48, "super", 0.003, 0.15, 0.7, 20 + k), t0, 5)
        s.note("bass", "pluck", t0, {"Dm": 38, "Bb": 34, "F": 41, "C": 36}[name], 0.95, 0.45, 2, role="bass")
        s.strike("tom", "", t0, 0.95, -3, k, 90 + 18 * k)
    groove(m["pillars"] + 2.0, m["converge"], "half", 0)
    bassline(m["pillars"] + 2.0, m["converge"], "pulse", 0)
    s.changes(m["converge"], [(2, "Bb"), (3, "Csus4"), (2, "C")])
    pads(m["pillars"] + 2.0, m["point"], -4, 4500)
    arpeggio(m["pillars"] + 2.0, m["point"], -4, 1, 0.75, ramp=lambda p: 6 * p)
    s.rise(m["converge"], m["point"], -3, 300, 9000, seed=78)
    s.fill(m["converge"], m["point"], "snare", -24, -12)
    s.swell_into(m["point"], 1.0, -2)
    s.kick(m["point"], "pop", 1.0, 0)
    groove(m["point"], m["lock"] - 1.0, "drive", -1)
    bassline(m["point"], m["lock"] - 0.125, "roll", 0, 0.9)
    low(m["point"], m["lock"] - 0.125, -1)
    pads(m["point"], m["lock"], -2, 6000)
    arpeggio(m["point"], m["lock"] - 0.125, -3, 1, 0.8, ramp=lambda p: 4 * p)
    kick_ramp(m["lock"] - 1.0, m["lock"])
    s.fill(m["lock"] - 1.5, m["lock"] - 0.125, "snare", -18, -2)
    s.rise(m["point"], m["lock"], 0, 260, 12000, seed=88)
    s.swell_into(m["lock"], 1.0, 2)

    # ---------------------------------------------------------------- the name: 灵感台
    Z0 = m["lock"]
    s.changes(Z0, [(2, "F"), (2, "C"), (2, "Dm"), (1, "Bb")])
    s.impact(Z0, 1.8, 2)
    groove(Z0, m["dark"], "full", 1)
    bassline(Z0, m["dark"], "off", 1)
    low(Z0, m["dark"], 0)
    pads(Z0, m["dark"], 1, 9500)
    arpeggio(Z0, m["dark"], -3, 1, 0.85)
    hook(Z0, ["F", "C", "Dm", "Bb"], 0.95, until=m["dark"], gain=1)

    # ---------------------------------------------------------------- the residents: F major, a bounce in its step
    U0 = m["cut"]
    s.changes(U0, [(8, "F"), (4, "Dm"), (4, "Bb"), (4, "C"), (4, "F"), (4, "C")])
    for b0 in (U0, U0 + 1.0):
        s.kick(b0, "soft", 0.8, -4)
    for b0 in (U0 + 0.5, U0 + 1.5):
        s.strike("clap", "", b0, 0.5, -8)
    low(U0, U0 + 2.0, -4)
    S1 = m["swarm"]
    groove(S1, GARDEN, "bounce", 0)
    bassline(S1, GARDEN, "bounce", -1)
    low(S1, GARDEN, -3)
    pads(S1, GARDEN, -6, 3600)
    for beat, nm, beats in TUNE:  # the residents' tune: a struck bar, a pluck an octave down
        s.note("mallet", "marimba", S1 + beat * BEAT, midi(nm), 0.8, beats * BEAT, 2, pan=0.12)
        s.note("bass", "pluck", S1 + beat * BEAT, midi(nm) - 12, 0.6, 0.2, -6, "plucks", pan=-0.12)

    # ---------------------------------------------------------------- the back garden: the step slows
    s.changes(GARDEN, [(4, "Bbmaj7"), (2, "F"), (2, "C")])
    groove(GARDEN, GARDEN + 3.0, "soft", 0)
    bassline(GARDEN, GARDEN + 3.0, "pulse", -3, 0.6)
    low(GARDEN, m["device"], -3)
    pads(GARDEN, m["device"], -7, 2400, attack=0.4)
    for beat, nm, beats in ((0, "F6", 1.5), (1.5, "D6", .5), (2, "C6", 1), (3, "A5", 1), (4, "C6", 1), (5, "A5", 1)):
        s.note("mallet", "marimba", GARDEN + beat * BEAT, midi(nm), 0.65, beats * BEAT, -2, pan=0.1)
    s.fill(m["device"] - 1.0, m["device"], "snare", -24, -6, kicks=True)
    s.rise(m["device"] - 1.2, m["device"], -2, 300, 9000, seed=189)
    s.swell_into(m["device"], 1.0)

    # ---------------------------------------------------------------- made for one screen
    D0 = m["device"]
    s.changes(D0, [(4, "Dm"), (4, "Bb"), (2, "F"), (2, "C"), (2, "Dm"), (2, "Bb")])
    s.impact(D0, 1.2)
    groove(D0, m["walls"] - 0.125, "full", 0)
    bassline(D0, m["walls"] - 0.125, "roll", 0)
    low(D0, m["walls"], 0)
    pads(D0, m["walls"], 0, 8500)
    arpeggio(D0, m["walls"], -3, 1, 0.8)
    hook(D0 + 4.0, ["F", "C", "Dm", "Bb"], 0.9)
    for i, t0 in enumerate(SPECS):  # the numbers slam down
        s.impact(t0, 0.55, -4, crash=False)
        s.strike("tom", "", t0, 0.9, -2, i, 140 - 14 * i)
        stab(t0, voice(s.chord(t0 + 1e-4), 62, 77, None, 3), 1)

    # ---------------------------------------------------------------- three wallpapers
    W0 = m["walls"]
    s.changes(W0, [(2, "F"), (2, "C/E"), (2, "Dm")])
    for i, t0 in enumerate(WALL["calls"]):
        s.impact(t0, 0.75 + 0.1 * i, -2, crash=i == 0)
        stab(t0, notes(("F5 A5 C6", "E5 G5 C6", "D5 F5 A5")[i]), 3)
        for j, nn in enumerate(("C5 F5 A5", "C5 E5 G5", "A4 D5 F5")[i].split()):  # a flourish into each
            s.note("bass", "pluck", t0 - 0.1875 + 0.0625 * j, midi(nn) + 12, 0.7, 0.1, -3, "plucks")
    groove(W0, WALL["float"], "full", 0)
    bassline(W0, WALL["float"], "off", 0)
    low(W0, WALL["float"], 0)
    pads(W0, WALL["float"], 0, 8500)
    arpeggio(W0, WALL["float"], -3, 1, 0.8)

    # glass in the air: half time; the arpeggio up high, light on glass
    G0, G1 = WALL["float"], W0 + 5.5
    s.changes(G0, [(2, "Bbmaj7"), (2, "Gm9"), (1, "Csus4")])
    groove(G0, G1, "soft", 0)
    arpeggio(G0 + 0.25, G1, -4, 1, 0.6)
    pads(G0, G1, -4, 3000, attack=0.3)
    low(G0, G1, -5)

    # the device rises; the cards land on it; the picker; a tap
    s.changes(G1, [(2, "C"), (3, "F"), (0.5, "F")])
    s.rise(G1 - 0.6, WALL["risen"], -8, 200, 4000, seed=12)
    for i, t0 in enumerate(WALL["land"]):
        s.note("bass", "pluck", t0, midi(("A5", "C6", "F6")[i]), 0.75, 0.3, 0, "plucks")
    s.kick(WALL["risen"], "soft", 0.8, -3)
    groove(WALL["land"][2], WALL["open"], "soft", -1)
    bassline(WALL["land"][2], WALL["open"], "pulse", -4, 0.6)
    pads(G1, WALL["open"], -5, 2600, attack=0.3)
    s.note("mallet", "glock", WALL["pick"], midi("C6"), 0.6, 0.5, -3)
    s.note("mallet", "glock", WALL["pick"], midi("G6"), 0.55, 0.5, -3)

    # chosen: it opens, and night falls
    s.changes(WALL["open"], [(3, "Gm9")])
    s.impact(WALL["open"], 0.5, -6, crash=False)
    pads(WALL["open"], m["tag"], -2, 2000, attack=0.2)
    low(WALL["open"], m["tag"], -3)
    s.note("bass", "pluck", WALL["fall"], midi("D6"), 0.5, 0.5, -2, "plucks")
    s.note("bass", "pluck", WALL["fall"] + 0.375, midi("A5"), 0.45, 0.5, -3, "plucks")

    # ---------------------------------------------------------------- launch from here; the music opens on D major
    T0, F2 = m["tag"], m["flash2"]
    s.changes(T0, [(2, "Bb"), (2, "A")])
    groove(T0, F2 - 1.0, "drive", 0)
    kick_ramp(F2 - 1.0, F2)
    bassline(T0, F2 - 0.125, "roll", 0, 0.9)
    low(T0, F2 - 0.125, -1)
    pads(T0, F2, -1, 9000)
    arpeggio(T0, F2 - 0.125, -3, 1, 0.8, ramp=lambda p: 3 * p)
    s.fill(T0, F2 - 0.125, "snare", -24, -2)
    s.rise(T0 + 0.4, F2, 0, 300, 12000, seed=201)
    s.swell_into(F2, 1.0, 2)

    s.changes(F2, [(2, "D"), (2, "A"), (2, "Bm"), (2, "G")])
    s.impact(F2, 1.8, 2)
    groove(F2, F2 + 4.0, "full", 1)
    bassline(F2, F2 + 4.0, "off", 1)
    low(F2, F2 + 4.0, 0)
    pads(F2, F2 + 4.0, 1, 9500)
    arpeggio(F2, F2 + 4.0, -3, 1, 0.85)
    stabs(F2, F2 + 4.0, (3, 10, 14, 19, 26, 30), -3, 2)
    hook(F2, ["D", "A", "Bm", "G"], 0.95, gain=1)

    end = F2 + 4.0
    s.changes(end, [(8, "Dadd9")])
    s.impact(end, 1.4)
    tail = m["end"] - end
    vc = notes("D3 A3 D4 E4 F#4 A4 D5 F#5 A5")
    s.log.extend((end, tail, n0, "harmony") for n0 in vc)
    s.mix["pads"].add(tonal.pad(tuple(vc), round(tail - 0.3, 2), "super", 0.004, 1.2, 0.7, 33), end, 2)
    for i, nn in enumerate(notes("A4 D5 F#5")):
        s.log.append((end, tail - 0.6, nn, "melody"))
        s.mix["lead"].add(tonal.lead(nn, round(tail - 0.6, 2), "saw", 0.7), end, -4 - 2 * i, -0.2 + 0.2 * i)
    s.note("bass", "pluck", end, midi("D2"), 0.8, tail - 0.5, 0, role="bass")
    low(end, m["end"], 0)
    for i, nn in enumerate(notes("D6 F#6 A6 D7")):
        s.note("bass", "pluck", end + 0.25 * i, nn, 0.75, 0.5, -3 - i, "plucks", pan=-0.3 + 0.2 * i)
    return s
