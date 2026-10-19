"""New fusion: the piano and the mallets in front, the cinema behind them, a keynote's pulse under them.

Written after hearing the six. The grand piano with its soft synth pulse (Piano & Pulse) and the marimba,
kalimba, whistle, ukulele and the band of hands (Claps & Mallets) carry it. Spiccato strings, taiko, braams
and a choir (Cinematic) give the reveals their weight; a four-on-the-floor, a pumping pad and offbeat
house piano (Keynote) drive the two brightest passages. The launch score is still there, quietly: its
hook as a soft synth line an octave under the theme, and the residents' tune. Nothing of its place.

F major with D minor's colours; night falls in G minor, and the end lifts a whole step into G major.
"""
from .. import kit, tonal
from ..clock import BEAT, GARDEN, M, WALL
from ..song import Song, q
from ..theory import midi, notes, voice
from .common import SPECS
from .fusion import CELL as LAUNCH_HOOK, TUNE
from .mallets import CELL as MALLET_HOOK
from .piano import THEME as PIANO_THEME

SWING = 0.1
BOUNCE = "X.xx.xx.X.xx.x.x"        # the marimba's figure in sixteenths
BOUNCE_ORDER = (0, 2, 3, 1, 2, 3, 0, 3, 1, 2)


def moved(cells, semis, names):
    """The same cells moved by `semis` semitones, filed under new chord names: {old name: new name}."""
    return {new: tuple((b, midi(n) + semis, length) for b, n, length in cells[old]) for old, new in names.items()}


THEME = moved(PIANO_THEME, 2, {"Eb": "F", "Bb/D": "C/E", "Cm7": "Dm7", "Abmaj7": "Bbmaj7", "Ab": "Bb", "Bb": "C"})
THEME_G = moved(PIANO_THEME, 4, {"Eb": "G", "Bb/D": "D/F#", "Cm7": "Em7", "Abmaj7": "Cmaj7"})
HOOK = moved(MALLET_HOOK, -7, {"C": "F", "G": "C", "Am": "Dm", "F": "Bb"})
OLD = moved(LAUNCH_HOOK, 0, {"F": "F", "C": "C", "Dm": "Dm", "Bb": "Bb"})
OLD_G = moved(LAUNCH_HOOK, 2, {"F": "G", "C": "D", "Dm": "Em", "Bb": "C"})


def compose():
    s = Song("新融合 · New Fusion", "F4", "major", fader_depth=3.3,
             bell=lambda m, v=0.6: tonal.mallet(int(m), "glock", round(v, 2)),
             pluck=lambda m, v=0.6: tonal.mallet(int(m), "kalimba", round(v, 2)))
    s.mix["mallets"].gain = -2.0
    s.mix["lead"].gain = -10.0     # the whistle colours the line; the launch hook rides lower still
    s.mix["plucks"].gain = -1.0
    s.mix["strings"].gain = -13.0
    s.mix["brass"].gain = -14.0     # the cinema stays behind the piano and the mallets
    s.mix["choir"].gain = -7.0
    s.mix["pads"].gain = -16.0     # the keynote's pump, underneath
    s.mix["pads"].duck = 0.6
    s.mix["perc"].gain = 3.0
    s.mix["bass"].gain = 0.0
    s.tilt = s.tilt + (("lowshelf", 150, 2.0, 0.7), ("peak", 200, 1.5, 0.8), ("peak", 3000, 2.0, 0.9), ("highshelf", 6000, 2.0, 0.7))
    m = M

    # ---------------------------------------------------------------- the players
    def theme(a, names, vel=0.85, until=None, gain=0.0, cells=THEME, whistle=False, strings=True):
        """The piano's theme in octaves, a string line under it; the whistle doubling its top."""
        for k, name in enumerate(names):
            for beat, n0, beats in cells[name]:
                t0 = a + (2 * k + beat) * BEAT
                if until is not None and t0 >= until - 1e-6:
                    return
                h = beats * BEAT * 0.95
                s.piano(t0, [n0, n0 - 12], vel, h + 0.2, gain=gain + 1, role="melody")
                if strings:
                    s.mix["strings"].add(tonal.strings((n0 - 12,), round(h + 0.1, 3), 0.75, 0.08, 0.35, "legato", 5, int(t0 * 8) % 5), t0, gain - 2)
                if whistle:
                    s.note("lead", "whistle", t0 + 0.004, n0, vel * 0.8, h, gain - 5)

    def hook(a, names, vel=0.85, until=None, gain=0.0, whistle=True, glock=False):
        """The marimba's hook, a pizzicato under it, the whistle an octave up."""
        for k, name in enumerate(names):
            for beat, n0, beats in HOOK[name]:
                t0 = a + (2 * k + beat) * BEAT
                if until is not None and t0 >= until - 1e-6:
                    return
                h = beats * BEAT * 0.9
                s.note("mallet", "marimba", t0, n0, vel, h, gain - 1, pan=0.08)
                s.note("pluck", "pizz", t0, n0 - 12, vel * 0.7, min(h, 0.2), gain - 6, pan=-0.15)
                if whistle:
                    s.note("lead", "whistle", t0 + 0.004, n0 + 12, vel * 0.85, h, gain - 3)
                if glock:
                    s.note("mallet", "glock", t0, n0 + 24, vel * 0.45, h, gain - 9, pan=0.25)

    def launch_hook(a, names, until=None, gain=0.0, cells=OLD):
        """The launch score's hook, an octave down on a soft synth: a trace of where the film began."""
        for k, name in enumerate(names):
            for beat, n0, beats in cells[name]:
                t0 = a + (2 * k + beat) * BEAT
                if until is not None and t0 >= until - 1e-6:
                    return
                h = beats * BEAT * 0.9
                s.log.append((t0, h, n0 - 12, "melody"))
                s.mix["lead"].add(tonal.lead(n0 - 12, round(h, 3), "soft", 0.6), t0, gain - 13, -0.2)

    def bounce(a, b, vel=0.6, gain=0.0, inst="marimba", low=60, high=79, pat=BOUNCE, swing=SWING):
        prev = None
        for t, v, k in s.hits(a, b, pat, 0.125, swing, seed=11):
            nominal = a + k * 0.125
            name = s.chord(nominal + 1e-4)
            if not name:
                continue
            vc = voice(name, low, high, prev, 4)
            prev = vc
            n0 = vc[BOUNCE_ORDER[k % len(BOUNCE_ORDER)] % len(vc)]
            s.note("mallet", inst, t, n0, vel * v, 0.2, gain, pan=0.4 * ((k % 3) - 1), role="harmony@" + str(round(nominal, 4)))

    def strum(a, b, pat, vel=0.6, gain=0.0, low=55, high=74, swing=SWING):
        """A ukulele: down on the beat, up between, each a quick roll of the chord."""
        prev = None
        for t, v, k in s.hits(a, b, pat, 0.125, swing, seed=13):
            nominal = a + k * 0.125
            name = s.chord(nominal + 1e-4)
            if not name:
                continue
            vc = voice(name, low, high, prev, 4)
            prev = vc
            for i, n0 in enumerate(vc if k % 2 == 0 else vc[::-1]):
                s.note("pluck", "uke", t + 0.012 * i, n0, vel * v * (1 - 0.07 * i), 0.24, gain, pan=0.32, role="harmony@" + str(round(nominal, 4)))

    def pulse(a, b, vel=0.6, gain=0.0, step=0.25, pat="x"):
        """The soft synth pulse under the piano."""
        s.arp(a, b, "bass", "pluck", step, (0, 1, 2, 1), 55, 72, 3, vel, gain - 8, bus="plucks", hold=step * 0.8, pat=pat)

    def ostinato(a, b, vel=0.6, gain=0.0, low=50, high=69, pat="XxxxXxxxXxxxXxxx", order=(0, 1, 2, 1)):
        """Spiccato strings in sixteenths, each note doubled an octave up."""
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

    def braam(t, ns, dur, gain=0.0):
        ns = tuple(notes(ns))
        s.log.extend((t, dur, n0, "harmony") for n0 in ns)
        s.mix["brass"].add(kit.braam(ns, round(dur, 2), int(t) % 3), t, gain - 4)

    def pump(a, b, gain=0.0):
        """The keynote's pad, breathing under the kick."""
        s.sustain(a, b, "warm", 53, 72, 4, gain, attack=0.05, release=0.25, bright=0.6)

    def roll(t, ns, length, vel=0.6, gain=0.0, inst="marimba"):
        k, tt = 0, t
        while tt < t + length - 1e-6:
            s.note("mallet", inst, tt, ns[k % len(ns)], vel * (1 - 0.6 * (tt - t) / length), 0.12, gain, pan=0.3 * ((k % 2) * 2 - 1))
            k += 1
            tt += 0.0625

    def claps_roll(a, b, g0=-12.0, g1=0.0):
        t, k = a, 0
        while t < b - 1e-6:
            p = (t - a) / (b - a)
            s.strike("clap", "", t, 0.6 + 0.4 * p, g0 + (g1 - g0) * p, k)
            t += 0.25 if p < 0.5 else 0.125 if p < 0.8 else 0.0625
            k += 1

    def kick_ramp(a, b, g=0.0):
        t = a
        while t < b - 0.125 - 1e-6:
            s.kick(t, "pop", 0.9, g - 2)
            t += 0.25 if t < b - 0.5 else 0.125

    def band(a, b, g=0.0, congas=True, four=False):
        """The band of hands over the piano's deep kick: claps on two and four, tambourine, snaps, congas.
        four: the keynote's kick on every beat instead."""
        parts = {"clap": "....X.......X...", "snare": ("....x.......x...", -7.0), "tamb": "x-x-x-x-x-x-x-x-", "snap": ("..x...x...x...x.", -4.0)}
        if four:
            parts["kick"] = "X...X...X...X..."
        else:
            parts["kick:deep"] = "X.......X.....x."
        if congas:
            parts.update({"conga": ("..x..x....x..x..", -2.0), "congahi": ("x......x.x......", -3.0), "bongo": (".......x.......x", -5.0)})
        s.groove(a, b, parts, g, swing=SWING)

    def bass(a, b, g=0.0, vel=0.85):
        s.bassline(a, b, "X..x..x.X..x..x.", "finger", vel=vel, gain=g, swing=SWING)

    def verse(a, b, g=0.0):
        s.groove(a, b, {"kick": "X.....x.X.......", "snap": "....x.......x...", "shaker": "xoxoxoxoxoxoxoxo", "conga": ("......x.......x.", -4.0)}, g - 1, swing=SWING)
        s.bassline(a, b, "x..x....x..x..x.", "finger", vel=0.75, gain=g - 1, swing=SWING)

    # ---------------------------------------------------------------- once upon a time: a felt piano, a kalimba answering
    s.changes(0.0, [(4, "Fmaj9"), (4, "Bbmaj7")])
    for beat, nm, beats, v in ((1, "A4", 1, .42), (2, "C5", 1, .45), (3, "E5", .5, .45), (3.5, "F5", .5, .4),
                               (5, "D5", 1, .45), (6, "F5", .5, .5), (6.5, "A5", .5, .52), (7, "C6", 1, .5)):
        s.piano(beat * BEAT, [midi(nm)], v, beats * BEAT * 1.8, felt=True, gain=5, role="melody")
    s.piano(0.0, notes("F2 C3"), 0.45, 1.9, felt=True, gain=3)
    s.piano(2.0, notes("Bb1 F2"), 0.45, 1.9, felt=True, gain=3)
    s.note("mallet", "kalimba", 2.0, midi("F6"), 0.5, 0.8, 0, pan=0.3)
    s.note("mallet", "kalimba", 2.25, midi("D6"), 0.45, 0.8, -1, pan=0.3)
    s.sustain(0.6, m["press1"], "air", 60, 79, 3, -6, attack=2.0, release=1.2, bright=0.35)
    for i, t0 in enumerate((m["draw0"], m["draw0"] + 0.75, m["draw1"], m["draw1"] + 0.5)):
        s.strike("snap", "", t0, 0.45, -8, i)
    claps_roll(m["press1"] - 0.75, m["press1"], -20, -12)
    s.swell_into(m["press1"], 0.8, -6)

    # ---------------------------------------------------------------- the Home button: the pulse and the kalimba begin
    P1, P2 = m["press1"], m["press2"]
    s.changes(P1, [(4, "Bbmaj7"), (2, "C")])
    s.impact(P1, 0.4, -8, crash=False)
    pulse(P1, P2, 0.5, -1)
    bounce(P1, P2, 0.42, -4, "kalimba", 65, 84)
    s.groove(P1, P2, {"kick:soft": "X.......x.......", "shaker": ("..x...x...x...x.", -4.0)}, swing=SWING)
    s.sustain(P1, P2, "sub", gain=-6)
    s.piano(m["home"] + 0.5, notes("C6 F6 A6"), 0.5, 1.0, gain=-2, role="melody")
    for i, nn in enumerate(notes("F5 A5 C6 D6 F6 A6 C7 D7 F7 A7")):  # a bead of light runs the arc
        s.note("mallet", "glock", m["home"] + 1.0 + 0.125 * i, nn, 0.4 + 0.03 * i, 0.4, -7, pan=-0.6 + 0.13 * i)
    claps_roll(P2 - 0.5, P2, -18, -8)

    # ---------------------------------------------------------------- the build: the strings come in, the old hook under them
    s.changes(P2, [(4, "Dm"), (2, "Bb"), (2, "C"), (2, "Csus4")])
    s.impact(P2, 0.7, -3)
    s.strike("taiko", "", P2, 0.8, -5)
    bounce(P2, m["flash"], 0.58, -1)
    pulse(P2, m["flash"], 0.5, -2)
    ostinato(P2 + 1.0, m["flash"], 0.5, -5)
    s.sustain(P2, m["flash"], "strings", 46, 72, 4, -5, 0.7, attack=2.0, release=0.4)
    launch_hook(P2, ["Dm", "Dm", "Bb", "C"], gain=-1)
    s.groove(P2, m["flash"] - 0.5, {"kick:deep": "X.......X......."}, -4)
    s.groove(P2 + 2.0, m["flash"] - 0.5, {"clap": "....X.......X...", "tamb": "x-x-x-x-x-x-x-x-", "conga": ("..x..x....x..x..", -4.0)}, -3, swing=SWING)
    s.bassline(P2 + 2.0, m["flash"] - 0.25, "x.x.x.x.x.x.x.x.", "finger", vel=0.7, gain=-2)
    s.rise(m["morph"], m["flash"], -2, seed=1)
    claps_roll(m["flash"] - 2.0, m["flash"], -14, 0)
    s.swell_into(m["flash"], 1.2, -1)

    # ---------------------------------------------------------------- a place: the piano's theme over the band of hands
    F0 = m["flash"]
    s.changes(F0, [(2, "F"), (2, "C/E"), (2, "Dm7"), (2, "Bbmaj7")])
    s.impact(F0, 1.4)
    band(F0, m["bench"])
    bass(F0, m["bench"])
    theme(F0, ["F", "C/E", "Dm7", "Bbmaj7"], 0.92, gain=1, whistle=True)
    bounce(F0, m["bench"], 0.7, 1)
    strum(F0, m["bench"], "x.x.x.xx.xx.x.x.", 0.58, -2)
    s.sustain(F0, m["bench"], "strings", 46, 72, 4, -8, 0.7, attack=0.3)

    # ---------------------------------------------------------------- the workbench: kalimba and pulse, four layers part
    B0 = m["bench"]
    s.changes(B0, [(4, "Dm"), (4, "Bbmaj7"), (3, "F"), (2, "C")])
    verse(B0, m["implode"] - 0.5)
    pulse(B0, m["implode"] + 0.5, 0.55, -1)
    bounce(B0, m["implode"] - 0.25, 0.48, -3, "kalimba", 64, 84)
    s.comp(B0, m["implode"], "x.......x.......", 51, 72, 4, 0.5, 0.9, felt=True, gain=2)
    for i, ch in enumerate(("F5 A5 D6", "A5 D6 F6", "D6 F6 A6", "F6 A6 D7")):  # four layers part
        t0 = m["explode"] + 0.5 + 0.25 * i
        s.piano(t0, notes(ch), 0.65 + 0.05 * i, 0.3)
        for n0 in notes(ch):
            s.note("mallet", "marimba", t0, n0, 0.7 + 0.05 * i, 0.3, -3)
        s.strike("bongo", "", t0, 0.9, 0, i)
        s.strike("taiko", "", t0, 0.6, -8, i)
    s.kick(m["implode"] + 0.9, "deep", 0.85, -3)
    s.strike("congahi", "", m["implode"] + 0.9, 0.9, -2, 0, "slap")

    # ---------------------------------------------------------------- the launch pad
    L0 = m["launch"]
    s.changes(L0, [(4, "Dm"), (2, "Bb"), (1, "C")])
    s.comp(L0, m["warp"], "x.......x.......", 51, 72, 4, 0.45, 0.9, felt=True, gain=2)
    bounce(L0, m["fly"], 0.38, -5, "kalimba", 64, 84, pat="x.x.x.x.x.x.x.x.")
    s.groove(L0, m["warp"], {"shaker": "x-x-x-x-x-x-x-x-", "kick:soft": "X.......X......."}, -3, swing=SWING)
    s.sustain(L0, m["warp"], "sub", gain=-5)
    for i, nn in enumerate(notes("D5 F5 A5 C6 D6 F6 A6 C7 D7")):  # the piano follows the light in flight
        s.piano(m["fly"] + 0.03 + i * 0.045, [nn], 0.45 + 0.05 * i, 0.15, gain=-2, role="melody")
    claps_roll(m["warp"], m["slit"], -16, -6)
    s.rise(m["warp"] - 0.05, m["slit"], -3, 500, 11000, seed=2)

    # ---------------------------------------------------------------- the narrow way; the door
    S0, O0 = m["slit"], m["open"]
    s.changes(S0, [(2, "Dm9")])
    s.piano(S0, notes("A5"), 0.45, 1.0, felt=True, gain=3, role="melody")
    s.piano(S0 + 0.5, notes("E5"), 0.4, 0.6, felt=True, gain=3, role="melody")
    s.kick(S0, "soft", 0.6, -6)
    s.sustain(S0, O0, "strings", 38, 50, 2, -4, 0.5, attack=0.3)
    s.swell_into(O0, 0.9, 0)
    s.changes(O0, [(4, "Dm9"), (2, "Bb")])
    s.impact(O0, 0.95)
    s.strike("taiko", "", O0, 0.9, -3)
    for i, nn in enumerate(notes("D4 E4 F4 A4 C5 D5 E5 F5 A5 C6 D6 E6")):  # every colour, up the bars
        s.note("mallet", "marimba", O0 + 0.03 * i, nn, 0.7, 0.4, -1, pan=-0.8 + 0.145 * i)
    ostinato(O0, m["rise"], 0.58, -3)
    pulse(O0, m["rise"], 0.5, -1, 0.125)
    bounce(O0, m["rise"], 0.45, -6, "kalimba", 67, 88)
    s.groove(O0, m["rise"] - 0.5, {"kick:deep": "X.......X.......", "clap": "....x.......x...", "shaker": "-o-o-o-o-o-o-o-o", "conga": ("..x..x....x..x..", -4.0)}, -1, swing=SWING)
    s.bassline(O0, m["rise"], "x.x.x.x.x.x.x.x.", "finger", vel=0.8)
    s.sustain(O0, m["rise"], "strings", 46, 72, 4, -7, 0.65, attack=0.5)
    claps_roll(m["rise"] - 0.5, m["rise"], -14, -4)

    # ---------------------------------------------------------------- the wave
    R0, J0 = m["rise"], m["jump"]
    s.changes(R0, [(2, "Bbmaj7"), (2, "C")])
    s.impact(R0, 0.9)
    s.piano(R0, notes("Bb4 D5 F5 A5"), 0.9, 0.5)
    s.comp(R0, J0 - 0.125, "xxxxxxxxxxxxxxxx", 43, 67, 2, 0.7, 0.11, order=(0, 1))
    s.sustain(R0, J0, "strings", 48, 77, 5, -2, 0.85, attack=1.7, release=0.2)
    s.sustain(R0, J0, "choir", 60, 79, 4, -6, 0.7, attack=1.6, release=0.2, vowel="a")
    s.groove(R0 + 0.5, J0 - 0.125, {"taiko": "X...x...x.x.xxxx"}, -5)
    kick_ramp(R0 + 1.0, J0)
    claps_roll(R0 + 0.5, J0 - 0.125, -12, 2)
    s.rise(R0 + 0.3, J0, 0, 300, 12000, seed=4)
    s.swell_into(J0, 1.0, 2)

    # ---------------------------------------------------------------- out into the world: everything, the piano on top
    s.changes(J0, [(2, "Dm7"), (2, "Bbmaj7"), (2, "F"), (2, "C")])
    s.impact(J0, 1.8, 1)
    braam(J0, "D2 A2 D3 F3", 1.0, -2)
    band(J0, m["back"] - 0.5, 1)
    s.groove(J0, m["back"] - 0.5, {"taiko": ("X.......X.......", -2.0)}, -3)
    bass(J0, m["back"], 1, 0.9)
    theme(J0, ["Dm7", "Bbmaj7", "F", "C"], 0.95, gain=1, whistle=True)
    bounce(J0, m["back"], 0.7, 1)
    strum(J0, m["back"] - 0.25, "x.x.x.xx.xx.x.x.", 0.6, -1)
    ostinato(J0, m["back"], 0.55, -6)
    s.sustain(J0, m["back"], "choir", 60, 79, 4, -6, 0.7, attack=0.3, release=0.5, vowel="a")
    pump(J0, m["back"], -2)
    launch_hook(J0, ["Dm", "Bb", "F", "C"], gain=-2)
    for i in range(4):  # out of the tunnel
        s.strike("congahi", "", m["back"] - 0.5 + 0.125 * i, 0.95, 0, i, "slap" if i % 2 else "open")
        s.strike("tom", "", m["back"] - 0.5 + 0.125 * i, 0.85, -4, i, 150 - 20 * i)

    # ---------------------------------------------------------------- the stage: hush, the light fires, the lasers
    K0 = m["back"]
    s.changes(K0, [(4, "Dm"), (4, "Bbmaj7"), (4, "F"), (2, "C")])
    s.comp(K0, m["sheet"], "x.......x.......", 51, 72, 4, 0.5, 0.95, felt=True, gain=2)
    bounce(K0, m["show"], 0.36, -6, "kalimba", 64, 84, pat="x.o.x.o.x.o.x.o.")
    s.groove(K0 + 2.0, m["lasers"], {"snap": "....x.......x...", "kick:soft": "X.......X......."}, -2, swing=SWING)
    for i, b0 in enumerate((m["burst"], m["burst"] + 0.35, m["burst"] + 0.7)):  # the light fires: marimba, hands, brass
        for n0 in (notes("F6 A6") if i < 2 else notes("A6 D7")):
            s.note("mallet", "marimba", b0, n0, 0.65 + 0.06 * i, 0.3, -1)
        s.strike("clap", "", b0, 0.7, -5, i)
        s.brass_hit(b0, notes("D5 F5 A5"), 0.12, 0.7 + 0.08 * i, -6)
    pulse(m["sheet"], m["show"], 0.5, -1, 0.125)
    s.groove(m["sheet"], m["lasers"], {"shaker": "xoxoxoxoxoxoxoxo"}, -2, swing=SWING)
    s.bassline(m["sheet"], m["show"] - 0.25, "x..x..x.x..x..x.", "finger", vel=0.75, swing=SWING)
    s.groove(m["lasers"], m["show"] - 0.5, {"kick": "X...x...X...x...", "clap": "....x.......x...", "tamb": "x-x-x-x-x-x-x-x-", "conga": ("..x..x....x..x..", -4.0)}, -2, swing=SWING)
    s.arp(m["lasers"], m["show"], "pluck", "pizz", 0.125, (0, 1, 2, 3, 2, 1), 64, 86, 4, 0.6, -3)
    s.sustain(m["lasers"], m["show"], "strings", 46, 72, 4, -6, 0.7, attack=1.5)
    claps_roll(m["show"] - 1.0, m["show"], -16, -2)
    s.rise(m["show"] - 1.5, m["show"], -4, seed=5)
    s.swell_into(m["show"], 0.6, -2)

    # ---------------------------------------------------------------- the lights come up: the keynote's floor under the marimba
    H0 = m["show"]
    s.changes(H0, [(2, "F"), (2, "C"), (2, "Bb")])
    s.impact(H0, 0.8, -1)
    s.groove(H0, m["console"], {"kick": "X...X...X...X...", "clap": "....X.......X...", "ohat": ("..x...x...x...x.", -6.0), "tamb": "x-x-x-x-x-x-x-x-",
                                "conga": ("..x..x....x..x..", -3.0)})
    s.bassline(H0, m["console"], "x.x.x.x.x.x.x.x.", "pluck", vel=0.75, fifths="..O.")
    hook(H0, ["F", "C", "Bb"], 0.88)
    s.comp(H0, m["console"], "..x...x...x..xx.", 55, 74, 4, 0.6, 0.11, gain=-3)
    pump(H0, m["console"], -1)

    # ---------------------------------------------------------------- the console: six dials, a note each
    C0 = m["console"]
    s.changes(C0, [(4, "Bb"), (4, "F"), (4, "C")])
    verse(C0, m["pillars"] - 1.0, 1)
    pulse(C0, m["pillars"], 0.55, 0, 0.125)
    s.comp(C0, m["pillars"] - 0.5, "..x...x...x..xx.", 55, 74, 4, 0.5, 0.11, gain=-5)
    s.sustain(C0, m["pillars"], "strings", 46, 70, 4, -8, 0.55)
    penta = notes("F5 G5 A5 C6 D6 F6 G6 A6 C7")
    for i, end in enumerate((84, 22, 74, 92, 72, 96)):  # each dial lands on a note as high as its value
        s.note("mallet", "marimba", m["knobs"] + 0.5 * i + 0.85, penta[min(8, int(end / 100 * 9))], 0.75, 0.4, 0, pan=-0.4)
        s.strike("congahi", "", m["knobs"] + 0.5 * i + 0.85, 0.6, -6, i)
    claps_roll(m["pillars"] - 1.0, m["pillars"], -16, -2)
    s.swell_into(m["pillars"], 1.0, -1)

    # ---------------------------------------------------------------- four places, one line, one point
    s.changes(m["pillars"], [(1, "Dm"), (1, "Bb"), (1, "F"), (3, "C")])
    for k, (ch, lo) in enumerate((("D4 A4 D5 F5", "D2 A2 D3"), ("D4 F4 Bb4 D5", "Bb1 F2 Bb2"), ("C4 F4 A4 C5", "F2 C3 F3"), ("C4 E4 G4 C5", "C2 G2 C3"))):
        t0 = m["pillars"] + 0.5 * k
        s.impact(t0, 0.6 + 0.15 * k, -3, crash=k == 0)
        braam(t0, lo, 0.42, -6)
        s.piano(t0, notes(ch) + [notes(lo)[0]], 0.85, 0.45)
        roll(t0, [n0 + 12 for n0 in notes(ch)], 0.42, 0.75, -2)
        s.strike("taiko", "", t0, 0.95, -2, k)
        s.strike("clap", "", t0, 0.9, -2, k)
    s.groove(m["pillars"] + 2.0, m["converge"], {"kick:deep": "X.......X.......", "clap": "........X......."}, -2)
    s.sustain(m["pillars"] + 2.0, m["converge"], "sub", gain=-4)
    s.changes(m["converge"], [(2, "Bb"), (3, "Csus4"), (2, "C")])
    ostinato(m["converge"], m["lock"] - 0.125, 0.6, -2)
    bounce(m["converge"], m["lock"] - 0.125, 0.55, -3)
    s.sustain(m["converge"], m["lock"], "strings", 48, 77, 5, -3, 0.85, attack=2.0, release=0.2)
    s.sustain(m["point"], m["lock"], "choir", 60, 79, 4, -6, 0.7, attack=1.8, release=0.2, vowel="a")
    s.rise(m["converge"], m["point"], -4, seed=6)
    s.kick(m["point"], "deep", 1.0, -1)
    s.groove(m["point"], m["lock"] - 0.125, {"taiko": "X.......X...x.x.", "tom": ("....x.......xxxx", -4.0, 115)}, -4)
    kick_ramp(m["lock"] - 1.0, m["lock"])
    claps_roll(m["lock"] - 1.5, m["lock"] - 0.125, -12, 2)
    s.rise(m["point"], m["lock"], 0, 260, 12000, seed=7)
    s.swell_into(m["lock"], 1.0, 2)

    # ---------------------------------------------------------------- the name
    Z0 = m["lock"]
    s.changes(Z0, [(2, "F"), (2, "C/E"), (2, "Dm7"), (1, "Bb")])
    s.impact(Z0, 1.9, 2)
    braam(Z0, "F2 C3 F3 A3", 1.0, -3)
    band(Z0, m["dark"], 1)
    s.groove(Z0, m["dark"], {"taiko": ("X...............", 0.0)}, -3)
    bass(Z0, m["dark"], 1, 0.9)
    theme(Z0, ["F", "C/E", "Dm7", "Bb"], 0.95, until=m["dark"], gain=1, whistle=True)
    bounce(Z0, m["dark"], 0.7, 1)
    strum(Z0, m["dark"], "x.x.x.xx.xx.x.x.", 0.6, -1)
    s.sustain(Z0, m["dark"], "choir", 60, 79, 4, -5, 0.75, attack=0.25, release=0.3, vowel="a")
    pump(Z0, m["dark"], -2)
    launch_hook(Z0, ["F", "C", "Dm", "Bb"], until=m["dark"], gain=-2)

    # ---------------------------------------------------------------- the residents: the old tune on the kalimba
    U0 = m["cut"]
    s.changes(U0, [(4, "F")])
    s.note("mallet", "kalimba", U0, midi("F4"), 0.5, 1.5, 0)
    s.note("mallet", "kalimba", U0, midi("C5"), 0.45, 1.5, 0)
    s.note("mallet", "kalimba", U0 + 1.0, midi("A5"), 0.45, 1.0, 1)
    s.piano(U0, notes("F2 C3"), 0.4, 1.8, felt=True, gain=2)
    s.groove(U0, m["swarm"], {"kick:soft": "X.......X.......", "snap": ("....o.......o...", -2.0)}, -6, swing=SWING)
    S1 = m["swarm"]
    s.changes(S1, [(4, "F"), (4, "Dm"), (4, "Bb"), (4, "C"), (4, "F"), (4, "C")])
    for beat, nm, beats in TUNE:
        s.note("mallet", "kalimba", S1 + beat * BEAT, midi(nm), 0.72, beats * BEAT, 0, pan=0.12)
        s.note("mallet", "marimba", S1 + beat * BEAT, midi(nm) - 12, 0.5, beats * BEAT, -5, pan=-0.12)
    s.groove(S1, GARDEN - 1.0, {"kick": "X.....x.X.......", "clap": ("....x.......x...", -3.0), "shaker": "xoxoxoxoxoxoxoxo",
                                "conga": ("..x..x....x..x..", -4.0), "bongo": (".......x.......x", -6.0)}, -4, swing=0.14)
    s.bassline(S1, GARDEN - 0.5, "x..x..x.x.....x.", "finger", vel=0.7, gain=-2, swing=0.14)
    strum(S1, GARDEN - 0.5, "..x...x...x...x.", 0.4, -6, swing=0.14)
    pulse(S1 + 4.0, GARDEN - 0.5, 0.42, -5, 0.25)

    # ---------------------------------------------------------------- the back garden: a felt piano, vibes, fireflies
    s.changes(GARDEN, [(4, "Bbmaj7"), (2, "F"), (2, "C")])
    s.comp(GARDEN, m["device"] - 0.5, "x.o.x.o.", 51, 72, 4, 0.6, 0.6, felt=True, gain=6, order=(0, 2, 1, 3), step=0.25)
    for beat, nm, beats in ((0, "F6", 1.5), (1.5, "D6", .5), (2, "C6", 1), (3, "A5", 1), (4, "C6", 1), (5, "A5", 1)):
        s.note("mallet", "vibes", GARDEN + beat * BEAT, midi(nm), 0.6, beats * BEAT, 2, pan=0.1)
    s.sustain(GARDEN, m["device"], "strings", 46, 72, 4, -7, 0.5, attack=1.4, release=0.5)
    claps_roll(m["device"] - 1.0, m["device"], -20, -4)
    s.rise(m["device"] - 1.2, m["device"], -4, seed=8)
    s.swell_into(m["device"], 1.0, -1)

    # ---------------------------------------------------------------- made for one screen
    D0 = m["device"]
    s.changes(D0, [(4, "Dm"), (4, "Bbmaj7"), (2, "F"), (2, "C"), (2, "Dm"), (2, "Bb")])
    s.impact(D0, 1.2)
    band(D0, m["walls"] - 0.125)
    bass(D0, m["walls"] - 0.125)
    ostinato(D0, D0 + 4.0, 0.55, -4)
    strum(D0, m["walls"] - 0.25, "x.x.x.xx.xx.x.x.", 0.5, -3)
    for i, t0 in enumerate(SPECS):  # the numbers slam down
        s.impact(t0, 0.55, -5, crash=False)
        s.piano(t0, notes(("D5 F5 A5 D3", "F5 A5 D6 Bb2", "D5 F5 A5 Bb2", "F5 A5 D6 Bb2")[i]), 0.85, 0.3)
        s.strike("taiko", "", t0, 0.95, -3, i)
        s.strike("conga", "", t0, 0.95, -1, i, "slap")
        s.brass_hit(t0, notes("D4 F4 A4"), 0.2, 0.9, -5)
    hook(D0 + 4.0, ["F", "C", "Dm", "Bb"], 0.88)
    bounce(D0 + 4.0, m["walls"], 0.42, -7, "kalimba", 67, 88)
    pump(D0 + 4.0, m["walls"], -3)

    # ---------------------------------------------------------------- three wallpapers
    W0 = m["walls"]
    s.changes(W0, [(2, "F"), (2, "C/E"), (2, "Dm")])
    for i, t0 in enumerate(WALL["calls"]):
        s.impact(t0, 0.75 + 0.1 * i, -2, crash=i == 0)
        s.piano(t0, notes(("F5 A5 C6 F3", "E5 G5 C6 E3", "D5 F5 A5 D3")[i]), 0.9, 0.5)
        for n0 in notes(("A5 C6 F6", "G5 C6 E6", "F5 A5 D6")[i]):
            s.note("mallet", "marimba", t0, n0, 0.85, 0.35, -1)
        for j, nn in enumerate(("C6 F6 A6", "C6 E6 G6", "A5 D6 F6")[i].split()):  # a flourish into each
            s.note("mallet", "glock", t0 - 0.1875 + 0.0625 * j, midi(nn) + 12, 0.5, 0.1, -7)
        s.strike("taiko", "", t0, 0.9, -3, i)
        s.strings_hit(t0, notes(("F4 A4 C5", "E4 G4 C5", "D4 F4 A4")[i]), 0.45, 0.9, -4)
    band(W0, WALL["float"])
    bass(W0, WALL["float"])
    bounce(W0, WALL["float"], 0.6, -2)

    # glass in the air: half time, the kalimba turning over like light on glass
    G0, G1 = WALL["float"], W0 + 5.5
    s.changes(G0, [(2, "Bbmaj7"), (2, "Gm9"), (1, "Csus4")])
    s.impact(G0, 0.4, -10, crash=False)
    s.arp(G0 + 0.25, G1, "mallet", "kalimba", 0.125, (0, 2, 1, 3, 2, 4, 3, 1), 72, 93, 4, 0.5, -1, "mallets")
    s.comp(G0, G1, "x.......x.......", 51, 72, 4, 0.5, 0.95, felt=True, gain=3)
    s.groove(G0, G1, {"kick:soft": "X.......X.......", "snap": "........X.......", "shaker": ("xoxoxoxoxoxoxoxo", -4.0)}, -3, swing=SWING)
    s.sustain(G0, G1, "glass", 62, 81, 3, -6, attack=0.6, release=0.5, bright=0.7)
    s.sustain(G0, G1, "sub", gain=-7)

    # the device rises; the cards land on it; the picker; a tap
    s.changes(G1, [(2, "C"), (3, "F"), (0.5, "F")])
    s.rise(G1 - 0.6, WALL["risen"], -10, 200, 4000, seed=12)
    for i, t0 in enumerate(WALL["land"]):
        n0 = midi(("G5", "C6", "F6")[i])
        s.note("mallet", "marimba", t0, n0, 0.7, 0.4, 0)
        s.piano(t0, [n0], 0.55, 0.5, gain=-3, role="melody")
    s.kick(WALL["risen"], "soft", 0.8, -4)
    bounce(WALL["land"][2], WALL["open"], 0.4, -5, "kalimba", 64, 84, pat="x...o...x...o...")
    pulse(WALL["land"][2], WALL["open"], 0.45, -3)
    s.groove(WALL["land"][2], WALL["open"], {"snap": "....x.......x...", "shaker": ("xoxoxoxoxoxoxoxo", -5.0)}, -4, swing=SWING)
    s.sustain(G1, WALL["open"], "strings", 51, 72, 4, -9, 0.5, attack=0.5)
    s.note("mallet", "glock", WALL["pick"], midi("C6"), 0.55, 0.6, -3)
    s.note("mallet", "glock", WALL["pick"], midi("F6"), 0.5, 0.6, -3)

    # chosen: it opens, and night falls
    s.changes(WALL["open"], [(3, "Gm9")])
    s.impact(WALL["open"], 0.5, -8, crash=False)
    s.sustain(WALL["open"], m["tag"], "strings", 46, 74, 5, -4, 0.75, attack=0.25, release=1.0)
    s.piano(WALL["open"], notes("G2 D3 A3 Bb3 F4 A4"), 0.6, 1.4, felt=True, spread=0.05, gain=4)
    s.note("mallet", "kalimba", WALL["fall"], midi("D6"), 0.42, 0.8, 0)
    s.note("mallet", "kalimba", WALL["fall"] + 0.375, midi("A5"), 0.38, 0.8, 0)

    # ---------------------------------------------------------------- launch from here: up a whole step, into G major
    T0, F2 = m["tag"], m["flash2"]
    s.changes(T0, [(2, "Eb"), (2, "D")])
    s.comp(T0, F2 - 0.125, "xxxxxxxxxxxxxxxx", 43, 67, 2, 0.65, 0.11, order=(0, 1))
    s.sustain(T0, F2, "strings", 48, 77, 5, -2, 0.85, attack=1.6, release=0.2)
    s.sustain(T0, F2, "choir", 60, 79, 4, -6, 0.7, attack=1.5, release=0.2, vowel="a")
    s.groove(T0 + 0.5, F2 - 0.125, {"taiko": "X...x...x.x.xxxx", "tom": ("..x...x.xxxxxxxx", -4.0, 120)}, -5)
    braam(T0 + 1.0, "D2 A2 D3", 0.95, -6)
    kick_ramp(T0 + 1.0, F2)
    claps_roll(T0, F2 - 0.125, -18, 2)
    s.rise(T0 + 0.4, F2, 0, 300, 12000, seed=9)
    s.swell_into(F2, 1.0, 2)

    s.changes(F2, [(2, "G"), (2, "D/F#"), (2, "Em7"), (2, "Cmaj7")])
    s.impact(F2, 2.0, 2)
    braam(F2, "G1 D2 G2 B2", 1.2, -2)
    band(F2, F2 + 4.0, 1, four=True)
    s.groove(F2, F2 + 4.0, {"taiko": ("X...............", 0.0)}, -3)
    bass(F2, F2 + 4.0, 1, 0.9)
    theme(F2, ["G", "D/F#", "Em7", "Cmaj7"], 0.95, gain=1, cells=THEME_G, whistle=True)
    bounce(F2, F2 + 4.0, 0.7, 1)
    strum(F2, F2 + 4.0, "x.x.x.xx.xx.x.x.", 0.6, -1)
    s.sustain(F2, F2 + 4.0, "choir", 62, 81, 4, -4, 0.8, attack=0.2, release=0.5, vowel="a")
    pump(F2, F2 + 4.0, -1)
    launch_hook(F2, ["G", "D", "Em", "C"], gain=-2, cells=OLD_G)

    end = F2 + 4.0
    s.changes(end, [(8, "Gadd9")])
    s.impact(end, 1.4)
    tail = m["end"] - end
    s.piano(end, notes("G1 D2 G2 B2 D3 A3 B3 D4 G4"), 0.85, tail, spread=0.014)
    roll(end, notes("G5 B5 D6 A6"), 1.6, 0.75, -2)
    s.sustain(end, m["end"], "strings", 46, 77, 5, -4, 0.7, attack=0.05, release=1.4)
    s.sustain(end, m["end"], "choir", 60, 79, 4, -7, 0.6, attack=0.15, release=1.4, vowel="o")
    s.sustain(end, m["end"], "sub", gain=-4)
    s.strike("clap", "", end, 1.0, 0, 0)
    s.strike("conga", "", end, 1.0, 0, 0, "slap")
    for i, nn in enumerate(notes("G6 B6 D7 G7")):
        s.note("mallet", "glock", end + 0.25 * i, nn, 0.55, 1.0, -5, pan=-0.3 + 0.2 * i)
    return s
