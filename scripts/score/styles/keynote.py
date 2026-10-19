"""Keynote: the music a product event opens with.

Electro-pop at 120: four on the floor, claps, a pumping pad breathing under the kick, an offbeat synth
bass, brass stabs, a syncopated lead that hooks on first hearing. Every reveal is a drop; between them the
band falls away to a filtered arpeggio and a heartbeat. A major, lifting to B major for the last words.
"""
from .. import tonal
from ..clock import BEAT, GARDEN, M, WALL
from ..song import Song
from ..theory import midi, notes, voice
from .common import SPECS, build, kick_ramp

HOOK = {
    "A": ((0, "E5", .75), (.75, "E5", .25), (1, "C#5", .5), (1.5, "B4", .5)),
    "E": ((0, "B4", .5), (.5, "E5", .5), (1, "G#5", .75), (1.75, "F#5", .25)),
    "F#m": ((0, "A5", .75), (.75, "G#5", .25), (1, "F#5", .5), (1.5, "C#5", .5)),
    "D": ((0, "D5", .5), (.5, "F#5", .5), (1, "E5", 1.0)),
}
TUNE_UP = 4   # the residents' tune, from F to A


def compose():
    s = Song("Keynote", "A3", "major", fader_depth=3.1,
             bell=lambda m, v=0.6: tonal.mallet(int(m), "glock", round(v, 2)),
             pluck=lambda m, v=0.6: tonal.pluck(int(m), 0.3, "uke", round(v, 2)))
    s.mix["pads"].duck = 0.5
    s.mix["lead"].gain = -6.0    # the hook rides just over the band
    s.mix["perc"].gain = 4.0
    s.mix["pads"].gain = -13.0
    s.mix["plucks"].gain = -2.0
    s.mix["brass"].gain = -1.0
    s.mix["mallets"].gain = -1.0
    s.mix["lead"].eq = (("peak", 1000, -2.5, 1.0), ("peak", 3200, 2.0, 1.0))   # presence, not honk
    s.mix["pads"].eq = (("peak", 250, 3.0, 0.8),)                              # body under the pump
    s.mix["choir"].gain = -7.0
    s.tilt = s.tilt + (("peak", 230, 2.5, 0.8), ("peak", 1000, -1.5, 1.0), ("peak", 2800, 2.0, 0.9))
    m = M
    W = M["walls"]
    sweep = [(0, 500), (M["press1"], 900), (M["press2"], 1200), (M["flash"] - 0.1, 9000), (M["flash"], 16000), (M["bench"], 16000),
             (M["bench"] + 0.1, 5000), (M["launch"], 2200), (M["warp"], 1500), (M["slit"], 700), (M["open"] - 0.1, 900), (M["open"], 6000),
             (M["rise"], 7000), (M["jump"] - 0.1, 12000), (M["jump"], 16000), (M["back"], 16000), (M["back"] + 0.1, 1200),
             (M["show"] - 0.1, 7000), (M["show"], 16000), (M["console"], 16000), (M["console"] + 0.1, 5000), (M["pillars"], 8000),
             (M["converge"], 2500), (M["lock"] - 0.1, 12000), (M["lock"], 16000), (M["dark"], 16000), (M["cut"], 1400), (GARDEN, 1600),
             (M["device"] - 0.1, 9000), (M["device"], 16000), (W + 3.0, 16000), (W + 3.1, 4000), (W + 5.3, 3000), (W + 8.0, 2500),
             (M["tag"], 900), (M["flash2"] - 0.1, 12000), (M["flash2"], 16000), (M["end"], 16000)]
    s.mix["plucks"].cutoff = sweep
    s.mix["pads"].cutoff = sweep

    def hook(a, names, vel=0.85, until=None, transpose=0, gain=0.0):
        for k, name in enumerate(names):
            key_ = {"B": "A", "F#": "E", "G#m": "F#m", "E": "D"}.get(name, name) if transpose else name
            for beat, nm, beats in HOOK[key_]:
                t0 = a + (2 * k + beat) * BEAT
                if until is not None and t0 >= until - 1e-6:
                    return
                n0 = midi(nm) + transpose
                h = beats * BEAT * 0.9
                s.mix["lead"].add(tonal.lead(n0, round(h, 3), "saw", round(vel, 2)), t0, gain - 1)
                s.note("mallet", "glock", t0, n0 + 12, vel * 0.5, h, gain - 9)
                s.log.append((t0, h, n0, "melody"))

    def drop(a, b, g=0.0, lead=None, transpose=0, stabs=True, choir=False):
        s.groove(a, b, {"kick": "X...X...X...X...", "clap": "....X.......X...", "snare:tight": ("....x.......x...", -6.0),
                        "hat": ("x-x-x-x-x-x-x-x-", 2.0), "ohat": ("..x...x...x...x.", 2.0), "shaker": ("xoxoxoxoxoxoxoxo", 0.0)}, g)
        s.bassline(a, b, "x.x.x.x.x.x.x.x.", "pluck", vel=0.9, fifths=".O.O.O.O.O.O.O.O", gain=g)
        s.sustain(a, b, "warm", 54, 76, 4, -1 + g, attack=0.05, release=0.4, bright=0.8)
        s.comp(a, b, "..x...x...x..xx.", 57, 79, 4, 0.8, 0.16, gain=g + 1)   # house piano on the off-beats
        if stabs:
            for t, v, k in s.hits(a, b, "........x.......", seed=int(a)):
                name = s.chord(a + k * 0.125 + 1e-4)
                if name:
                    s.brass_hit(t, voice(name, 64, 81, None, 3), 0.18, 0.85 * v, g - 5)
        s.arp(a, b, "bass", "pluck", 0.125, (0, 1, 2, 3, 2, 1, 3, 2), 69, 88, 4, 0.55, g - 9, bus="plucks")
        if lead:
            hook(a, lead, 0.9, until=b, transpose=transpose, gain=g)
        if choir:
            s.sustain(a, b, "choir", 64, 83, 4, -6 + g, 0.7, attack=0.15, release=0.4, vowel="a")

    def verse(a, b, g=0.0):
        s.groove(a, b, {"kick": "X...X...X...X...", "clap": "....x.......x...", "hat": ("xoxoxoxoxoxoxoxo", -3.0), "ohat": ("..x...x...x...x.", -8.0)}, g - 1)
        s.comp(a, b, "..x.....x.x.....", 57, 76, 4, 0.6, 0.14, gain=g - 2)
        s.bassline(a, b, "..x...x...x...x.", "pluck", vel=0.8, gain=g)
        s.arp(a, b, "bass", "pluck", 0.125, (0, 1, 2, 3, 2, 1, 3, 2), 66, 84, 4, 0.55, g - 6, bus="plucks")
        s.sustain(a, b, "warm", 57, 74, 4, -9 + g, attack=0.3, bright=0.45)

    # ---------------------------------------------------------------- once upon a time: an arpeggio behind glass
    s.changes(0.0, [(4, "F#m"), (4, "D")])
    s.sustain(0.3, m["press1"], "air", 57, 76, 4, -8, attack=2.2, release=1.2, bright=0.25)
    s.arp(m["photon"], m["press1"], "bass", "pluck", 0.125, (0, 2, 1, 3), 64, 81, 4, 0.45, -4, bus="plucks")
    s.fill(m["press1"] - 0.75, m["press1"], "snare", -24, -14)

    # ---------------------------------------------------------------- the Home button
    P1, P2 = m["press1"], m["press2"]
    s.changes(P1, [(4, "A"), (2, "E/G#")])
    s.impact(P1, 0.45, -6, crash=False)
    s.groove(P1, P2, {"kick:soft": "X.......X.......", "hat": ("..x...x...x...x.", -6.0)})
    s.arp(P1, P2, "bass", "pluck", 0.125, (0, 2, 1, 3), 64, 84, 4, 0.5, -8, bus="plucks")
    s.sustain(P1, P2, "sub", gain=-5)
    s.brass_hit(m["home"] + 0.5, notes("C#5 E5 A5"), 0.35, 0.6, -6)
    for i in range(10):
        s.note("mallet", "glock", m["home"] + 1.0 + 0.125 * i, notes("A5 C#6 E6 F#6 A6 C#7 E7 F#7 A7 B7")[i] - 12, 0.45, 0.3, -9, pan=-0.6 + 0.13 * i)
    s.fill(P2 - 0.5, P2, "snare", -20, -10)

    # ---------------------------------------------------------------- the build
    s.changes(P2, [(4, "F#m"), (2, "D"), (2, "E"), (2, "Esus4")])
    s.impact(P2, 0.8, -3)
    s.groove(P2, m["flash"] - 0.5, {"kick": "X...X...X...X...", "hat": ("..x...x...x...x.", -4.0)}, -2)
    s.groove(P2 + 2.0, m["flash"] - 0.5, {"clap": "....x.......x..."}, -3)
    s.bassline(P2, m["flash"] - 0.25, "..x...x...x...x.", "pluck", vel=0.8)
    s.arp(P2, m["flash"] - 0.125, "bass", "pluck", 0.125, (0, 1, 2, 3, 2, 1, 3, 2), 66, 86, 4, 0.55, -6, bus="plucks")
    s.sustain(P2, m["flash"], "warm", 57, 74, 4, -8, attack=1.5, bright=0.4)
    build(s, m["flash"] - 2.0, m["flash"], seed=1)

    # ---------------------------------------------------------------- drop: a place
    F0 = m["flash"]
    s.changes(F0, [(2, "A"), (2, "E"), (2, "F#m"), (2, "D")])
    s.impact(F0, 1.4)
    drop(F0, m["bench"], lead=["A", "E", "F#m", "D"])

    # ---------------------------------------------------------------- the workbench
    B0 = m["bench"]
    s.changes(B0, [(4, "F#m"), (4, "Dmaj7"), (3, "A"), (2, "E")])
    verse(B0, m["implode"] - 0.5)
    for i, ch in enumerate(("C#5 F#5 A5", "F#5 A5 C#6", "A5 C#6 F#6", "C#6 F#6 A6")):
        t0 = m["explode"] + 0.5 + 0.25 * i
        s.brass_hit(t0, notes(ch), 0.16, 0.75, -4)
        s.strike("tom", "", t0, 0.85, -2, i, 98 + 22 * i)
    s.sustain(m["implode"] - 0.5, m["launch"], "warm", 57, 74, 4, -12, attack=0.8)
    s.kick(m["implode"] + 0.9, "pop", 0.9, -3)

    # ---------------------------------------------------------------- the launch pad: the band drops away
    L0 = m["launch"]
    s.changes(L0, [(4, "F#m"), (2, "D"), (1, "E")])
    s.arp(L0, m["warp"], "bass", "pluck", 0.125, (0, 2, 1, 3), 64, 84, 4, 0.5, -7, bus="plucks")
    s.sustain(L0, m["warp"], "warm", 57, 74, 4, -10, attack=0.4, bright=0.3)
    s.groove(m["type"], m["warp"], {"hat": "x.x.x.x.x.x.x.x."}, -6)
    s.groove(m["fly"], m["warp"], {"kick": "X.x.X.x."}, -3)
    s.fill(m["warp"], m["slit"], "snare", -18, -6, kicks=True)
    s.rise(m["warp"] - 0.05, m["slit"], -2, 500, 11000, seed=2)

    # ---------------------------------------------------------------- the narrow way, the door
    S0, O0 = m["slit"], m["open"]
    s.changes(S0, [(2, "F#m9")])
    s.sustain(S0, O0, "air", 62, 81, 3, -9, attack=0.3, release=0.4, bright=0.6)
    s.kick(S0, "soft", 0.6, -6)
    s.kick(S0 + 0.5, "soft", 0.5, -8)
    build(s, S0, O0, fill=None, gain=-4, seed=3)
    s.changes(O0, [(4, "F#m9"), (2, "D")])
    s.impact(O0, 1.0)
    for i, nn in enumerate(notes("F#4 G#4 A4 C#5 E5 F#5 G#5 A5 C#6 E6 F#6 G#6")):
        s.note("pluck", "harp", O0 + 0.03 * i, nn, 0.7, 0.8, -4, pan=-0.8 + 0.145 * i)
    verse(O0, m["rise"] - 0.5, 1)
    s.fill(m["rise"] - 0.5, m["rise"], "snare", -16, -6)

    # ---------------------------------------------------------------- the wave: build hot
    R0, J0 = m["rise"], m["jump"]
    s.changes(R0, [(2, "Dmaj7"), (2, "E")])
    s.impact(R0, 0.9)
    s.brass_hit(R0, notes("C#5 F#5 A5 C#6"), 0.4, 0.9, -2)
    kick_ramp(s, R0 + 1.0, J0)
    s.bassline(R0, J0 - 0.125, "xxxxxxxxxxxxxxxx", "pluck", vel=0.8)
    s.arp(R0, J0, "bass", "pluck", 0.0625, (0, 1, 2, 3), 66, 88, 4, 0.5, -6, bus="plucks")
    s.sustain(R0, J0, "warm", 57, 76, 4, -6, attack=1.6, bright=0.8)
    build(s, R0 + 1.0, J0, seed=4)

    # ---------------------------------------------------------------- drop: out into the world
    s.changes(J0, [(2, "F#m"), (2, "D"), (2, "A"), (2, "E")])
    s.impact(J0, 1.7, 1)
    drop(J0, m["back"] - 0.25, 1, lead=["F#m", "D", "A", "E"], choir=True)
    for i in range(4):
        s.strike("tom", "", m["back"] - 0.5 + 0.125 * i, 0.9, 0, i, 150 - 20 * i)

    # ---------------------------------------------------------------- the stage: from a heartbeat to the lights
    K0 = m["back"]
    s.changes(K0, [(4, "F#m"), (4, "Dmaj7"), (4, "A"), (2, "E")])
    s.arp(K0, m["show"], "bass", "pluck", 0.125, (0, 2, 1, 3), 64, 84, 4, 0.5, -7, bus="plucks")
    s.sustain(K0, m["show"], "warm", 57, 74, 4, -11, attack=0.6, bright=0.3)
    s.groove(K0, m["burst"], {"kick:soft": "X.......X......."}, -4)
    for i, b0 in enumerate((m["burst"], m["burst"] + 0.35, m["burst"] + 0.7)):
        s.brass_hit(b0, notes("F#5 A5 C#6"), 0.12, 0.7 + 0.08 * i, -5)
    s.groove(m["sheet"], m["lasers"], {"kick": "X...X...X...X...", "hat": ("..x...x...x...x.", -4.0)}, -3)
    s.bassline(m["sheet"], m["show"] - 0.25, "..x...x...x...x.", "pluck", vel=0.8)
    s.groove(m["lasers"], m["show"] - 0.5, {"kick": "X...X...X...X...", "clap": "....x.......x...", "hat": "xoxoxoxoxoxoxoxo"}, -2)
    build(s, m["show"] - 1.0, m["show"], gain=-1, seed=5)

    # ---------------------------------------------------------------- drop: the lights
    H0 = m["show"]
    s.changes(H0, [(2, "A"), (2, "E"), (2, "D")])
    s.impact(H0, 0.8, -1)
    drop(H0, m["console"], lead=["A", "E", "D"])

    # ---------------------------------------------------------------- the console
    C0 = m["console"]
    s.changes(C0, [(4, "D"), (4, "A"), (4, "E")])
    verse(C0, m["pillars"] - 1.0)
    penta = notes("A5 B5 C#6 E6 F#6 A6 B6 C#7 E7")
    for i, end in enumerate((84, 22, 74, 92, 72, 96)):
        s.note("pluck", "uke", m["knobs"] + 0.5 * i + 0.85, penta[min(8, int(end / 100 * 9))], 0.7, 0.3, -2, pan=-0.4)
    build(s, m["pillars"] - 1.0, m["pillars"], kicks=True, seed=6)

    # ---------------------------------------------------------------- four places, one line, one point
    s.changes(m["pillars"], [(1, "F#m"), (1, "D"), (1, "A"), (3, "E")])
    for k, ch in enumerate(("F#4 A4 C#5 F#5", "F#4 A4 D5 F#5", "E4 A4 C#5 E5", "E4 G#4 B4 E5")):
        t0 = m["pillars"] + 0.5 * k
        s.impact(t0, 0.6 + 0.15 * k, -3, crash=k == 0)
        s.brass_hit(t0, notes(ch), 0.4, 0.95, -1)
        s.strike("tom", "", t0, 0.9, -1, k, 90 + 18 * k)
    s.groove(m["pillars"] + 2.0, m["converge"], {"kick": "X.......X.......", "clap": "........X......."}, -2)
    s.changes(m["converge"], [(2, "D"), (3, "Esus4"), (2, "E")])
    s.arp(m["converge"], m["lock"], "bass", "pluck", 0.0625, (0, 1, 2, 3), 66, 88, 4, 0.5, -7, bus="plucks")
    s.sustain(m["converge"], m["lock"], "warm", 57, 76, 4, -7, attack=2.0, bright=0.8)
    s.kick(m["point"], "pop", 1.0, -1)
    s.groove(m["point"], m["lock"] - 1.0, {"kick": "X...X...X...X...", "clap": "....x.......x..."}, -1)
    s.bassline(m["point"], m["lock"] - 0.125, "x.x.x.x.x.x.x.x.", "pluck", vel=0.85)
    kick_ramp(s, m["lock"] - 1.0, m["lock"], gain=-1)
    build(s, m["point"], m["lock"], seed=7)

    # ---------------------------------------------------------------- drop: the name
    Z0 = m["lock"]
    s.changes(Z0, [(2, "A"), (2, "E"), (2, "F#m"), (1, "D")])
    s.impact(Z0, 1.8, 2)
    drop(Z0, m["dark"], 1, lead=["A", "E", "F#m", "D"], choir=True)

    # ---------------------------------------------------------------- the residents
    U0 = m["cut"]
    s.changes(U0, [(4, "A")])
    s.arp(U0, m["swarm"], "pluck", "uke", 0.25, (0, 2, 1, 3), 64, 81, 4, 0.5, -3)
    s.sustain(U0, m["swarm"], "air", 62, 81, 3, -12, attack=0.8, bright=0.4)
    S1 = m["swarm"]
    s.changes(S1, [(4, "A"), (4, "F#m"), (4, "D"), (4, "E"), (4, "A"), (4, "E")])
    from .fusion import TUNE
    for beat, nm, beats in TUNE:
        s.note("pluck", "uke", S1 + beat * BEAT, midi(nm) + TUNE_UP - 12, 0.75, beats * BEAT, -1, pan=0.15)
        s.note("mallet", "glock", S1 + beat * BEAT, midi(nm) + TUNE_UP, 0.4, beats * BEAT, -10, pan=-0.1)
    s.groove(S1, GARDEN - 1.0, {"kick": "X.....x...X.....", "clap": ("....x.......x...", -3.0), "hat": ("x-x-x-x-x-x-x-x-", -6.0)}, -3, swing=0.1)
    s.bassline(S1, GARDEN - 0.5, "x..x..x.x..x..x.", "pluck", vel=0.75, swing=0.1)
    s.sustain(S1, GARDEN, "warm", 57, 74, 4, -12, attack=0.3, bright=0.4)

    # ---------------------------------------------------------------- the back garden
    s.changes(GARDEN, [(4, "Dmaj7"), (2, "A"), (2, "E")])
    s.sustain(GARDEN, m["device"], "warm", 54, 74, 4, -8, attack=1.0, bright=0.3)
    s.arp(GARDEN, m["device"] - 1.0, "pluck", "harp", 0.25, (0, 2, 1, 3), 62, 81, 4, 0.45, -4)
    build(s, m["device"] - 1.0, m["device"], kicks=True, seed=8)

    # ---------------------------------------------------------------- drop: made for one screen
    D0 = m["device"]
    s.changes(D0, [(4, "F#m"), (4, "Dmaj7"), (2, "A"), (2, "E"), (2, "F#m"), (2, "D")])
    s.impact(D0, 1.2)
    drop(D0, m["walls"] - 0.125, stabs=False)
    for i, t0 in enumerate(SPECS):
        s.impact(t0, 0.5, -6, crash=False)
        s.brass_hit(t0, notes(("C#5 F#5 A5", "D5 F#5 A5", "C#5 F#5 A5", "D5 F#5 A5")[i]), 0.22, 0.95, -1)
        s.strike("tom", "", t0, 0.9, -1, i, 140 - 14 * i)
    hook(D0 + 4.0, ["A", "E", "F#m", "D"], 0.9)

    # ---------------------------------------------------------------- three wallpapers
    W0 = m["walls"]
    s.changes(W0, [(2, "A"), (2, "E/G#"), (2, "F#m")])
    for i, t0 in enumerate(WALL["calls"]):
        s.impact(t0, 0.75 + 0.1 * i, -2, crash=i == 0)
        s.brass_hit(t0, notes(("C#5 E5 A5", "B4 E5 G#5", "C#5 F#5 A5")[i]), 0.3, 0.95, -1)
    s.groove(W0, WALL["float"], {"kick": "X...X...X...X...", "clap": "....X.......X...", "hat": "x.x.x.x.x.x.x.x."})
    s.bassline(W0, WALL["float"], "x.x.x.x.x.x.x.x.", "pluck", vel=0.9, fifths=".O.O.O.O.O.O.O.O")
    s.sustain(W0, WALL["float"], "warm", 57, 76, 4, -5, attack=0.05, bright=0.75)
    G0, G1 = WALL["float"], W0 + 5.5
    s.changes(G0, [(2, "Dmaj7"), (2, "Bm7"), (1, "Esus4")])
    s.arp(G0, G1, "mallet", "celesta", 0.125, (0, 2, 1, 3, 2, 4, 3, 1), 72, 93, 4, 0.45, -4, "mallets")
    s.sustain(G0, G1, "air", 62, 81, 3, -6, attack=0.5, bright=0.7)
    s.groove(G0, G1, {"kick:soft": "X.......X.......", "hat": ("..x...x...x...x.", -6.0)}, -4)
    s.changes(G1, [(2, "E"), (3, "A"), (0.5, "A")])
    s.rise(G1 - 0.6, WALL["risen"], -10, 200, 4000, seed=12)
    for i, t0 in enumerate(WALL["land"]):
        s.note("pluck", "uke", t0, notes("E5 A5 C#6")[i], 0.7, 0.4, -1)
    s.arp(WALL["land"][2], WALL["open"], "bass", "pluck", 0.125, (0, 2, 1, 3), 64, 84, 4, 0.45, -9, bus="plucks")
    s.sustain(G1, WALL["open"], "warm", 57, 74, 4, -11, attack=0.4, bright=0.35)
    s.note("mallet", "glock", WALL["pick"], midi("E6"), 0.6, 0.6, -6)
    s.changes(WALL["open"], [(3, "Bm9")])
    s.sustain(WALL["open"], m["tag"], "warm", 54, 74, 4, -6, attack=0.2, release=1.2, bright=0.4)
    s.sustain(WALL["open"], m["tag"], "air", 66, 86, 3, -9, attack=0.4, release=1.2, bright=0.5)

    # ---------------------------------------------------------------- launch from here: up to B major
    T0, F2 = m["tag"], m["flash2"]
    s.changes(T0, [(2, "D"), (2, "F#")])
    kick_ramp(s, T0 + 1.0, F2)
    s.arp(T0, F2, "bass", "pluck", 0.0625, (0, 1, 2, 3), 66, 88, 4, 0.5, -6, bus="plucks")
    s.bassline(T0, F2 - 0.125, "x.x.x.x.x.x.x.x.", "pluck", vel=0.85)
    s.sustain(T0, F2, "warm", 57, 76, 4, -6, attack=1.4, bright=0.8)
    build(s, T0, F2, seed=9)
    s.changes(F2, [(2, "B"), (2, "F#"), (2, "G#m"), (2, "E")])
    s.impact(F2, 1.9, 2)
    drop(F2, F2 + 4.0, 1, lead=["B", "F#", "G#m", "E"], transpose=2, choir=True)
    end = F2 + 4.0
    s.changes(end, [(8, "Badd9")])
    s.impact(end, 1.4)
    s.sustain(end, m["end"], "warm", 57, 79, 5, -3, attack=0.02, release=1.4, bright=0.6)
    s.sustain(end, m["end"], "choir", 64, 83, 4, -6, 0.7, attack=0.05, release=1.4)
    s.sustain(end, m["end"], "sub", gain=-2)
    s.brass_hit(end, notes("B4 D#5 F#5 B5"), 1.4, 0.9, -3, "swell")
    for i, nn in enumerate(notes("B5 D#6 F#6 B6")):
        s.note("mallet", "glock", end + 0.25 * i, nn, 0.5, 1.0, -8, pan=-0.3 + 0.2 * i)
    return s
