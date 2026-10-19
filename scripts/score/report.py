"""Checks for a rendered version: the loudness of every section against the energy the form asks of it, the
harmony and bass notes that fall outside the chord sounding under them, and a picture of the whole score."""
import numpy as np

from . import dsp, form
from .clock import DUR, M, SR
from .theory import chord, pcs

NAMES = "C C# D Eb E F F# G Ab A Bb B".split()


def sections(out):
    """(section, its mean energy, the 90th percentile of its momentary loudness in LUFS)."""
    _, starts, momentary = dsp.loudness(out, 0.4)
    rows = []
    for name, a, b, e0, e1 in form.SECTIONS:
        sel = (starts + 0.2 >= a) & (starts + 0.2 < b)
        v = momentary[sel]
        rows.append((name, (e0 + e1) / 2, float(np.percentile(v, 90)) if len(v) else -99.0))
    return rows


def harmony(song):
    """Harmony and bass notes outside the chord sounding where they start: (time, chord, role, note)."""
    wrong = []
    for t, _, m, role in song.log:
        if role.startswith("harmony@"):  # a comped chord is judged where it sits on the grid, not where the hand lands
            t, role = float(role.split("@")[1]), "harmony"
        if role not in ("harmony", "bass"):
            continue
        name = song.ch.at(t + 0.02)
        if name and m % 12 not in set(pcs(name)) | {chord(name)[2]}:
            wrong.append((round(t, 2), name, role, NAMES[m % 12]))
    return wrong


def figure(out, path, title=""):
    """The spectrogram over the scene marks; under it the loudness, momentary and short-term, against the
    energy of the form (blue: 6 dB a step, drawn from -40 LUFS at 0)."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from scipy import signal

    fig, (a1, a2) = plt.subplots(2, 1, figsize=(24, 9), sharex=True, gridspec_kw={"height_ratios": [2, 1.2]})
    f, tt, sp = signal.spectrogram(out.mean(0), SR, nperseg=4096, noverlap=3072)
    a1.pcolormesh(tt, f, 10 * np.log10(sp + 1e-14), shading="auto", cmap="magma", vmin=-130, vmax=-40)
    a1.set_yscale("symlog", linthresh=200)
    a1.set_ylim(30, 20000)
    if title:
        a1.set_title(title)
    _, mt, mo = dsp.loudness(out, 0.4)
    _, st, sh = dsp.loudness(out, 3.0)
    a2.plot(mt + 0.2, mo, lw=0.6, color="#888")
    a2.plot(st + 1.5, sh, lw=1.4, color="#d33")
    grid = np.linspace(0, DUR, 2000)
    a2.plot(grid, -40 + 6 * form.energy(grid), lw=1.2, color="#36c")
    a2.set_ylim(-50, -5)
    for name, t in M.items():
        for ax in (a1, a2):
            ax.axvline(t, color="cyan", lw=0.4, alpha=0.5)
        a2.text(t, -7, name, rotation=90, fontsize=7, va="top")
    a2.set_xlim(0, DUR)
    fig.tight_layout()
    fig.savefig(path, dpi=70)
    plt.close(fig)
