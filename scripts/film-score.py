"""Compose the concept film's score from its timeline.

    python3 scripts/film-score.py                                  # demo/film/score.webm and score.m4a
    python3 scripts/film-score.py --style piano                    # another version, in the same place
    python3 scripts/film-score.py --all --out scores/              # every version: scores/<style>.webm and .m4a
    python3 scripts/film-score.py --wav score.wav --report score.png
    python3 scripts/film-score.py --list

The score is the package in scripts/score/. It reads the scene marks in demo/film/film.js (clock.py), so
picture and sound keep one clock on a grid of 120 beats a minute; the film is cut into sections, each with
an energy from 0 to 5 (form.py), which sets how many instruments play and where the desk's faders sit, so
loud and quiet are always clearly apart. The instruments (tonal.py: piano, mallets, plucked strings, a
string section, pads, voices, brass, basses, leads; kit.py: drums and percussion, impacts, risers), the
harmony (theory.py), the desk with its buses, sends and master (mixer.py), the sound for the picture
(sfx.py) and the toolkit a version is written with (song.py) are shared; each version of the score is one
module in score/styles/. Everything is synthesized with numpy and scipy, with no samples or recordings.

The master sits at -16 LUFS integrated with true peaks under -1 dBTP. ffmpeg writes Opus (score.webm) and
AAC (score.m4a, also laid under the rendered video). Every run checks the harmony and prints the loudness
of each section against the energy it was written for.
"""
import argparse
import importlib
import pathlib
import subprocess
import sys
import tempfile
import time

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from score import report  # noqa: E402
from score.clock import FILM, ROOT, SR  # noqa: E402
from score.styles import DEFAULT, STYLES  # noqa: E402


def shown(path):
    try:
        return path.resolve().relative_to(ROOT)
    except ValueError:
        return path


def render(style, out, wav=None, figure=None):
    t0 = time.time()
    song = importlib.import_module("score.styles." + style).compose()
    mix, meter, _ = song.render()
    print(f"{STYLES[style]}")
    print(f"  {mix.shape[1] / SR:.2f} s, {meter['lufs']:.1f} LUFS integrated, true peak {meter['peak']:.1f} dBTP, "
          f"loudness range {meter['lra']:.1f} LU ({time.time() - t0:.0f} s)")
    rows = report.sections(mix)
    loud = sorted((r for r in rows if r[0] != "silence"), key=lambda r: -r[2])
    print("  loudest: " + ", ".join(f"{n} {v:.1f}" for n, _, v in loud[:3]) +
          "; quietest: " + ", ".join(f"{n} {v:.1f}" for n, _, v in loud[::-1][:3]) + " (LUFS, momentary, 90th percentile)")
    wrong = report.harmony(song)
    print(f"  harmony and bass notes outside their chord: {len(wrong)}")
    for t, name, role, note in wrong[:12]:
        print(f"    {t:7.2f}  {name:8s} {role:8s} {note}")
    pcm = (mix.T * 32767 + np.random.default_rng(0).triangular(-1, 0, 1, mix.T.shape)).clip(-32768, 32767).astype(np.int16)
    out = pathlib.Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        path = wav or str(pathlib.Path(tmp) / "score.wav")
        wavfile.write(path, SR, pcm)
        webm = out.with_suffix(".webm")
        # 256 kb/s: at 192 the AAC encoder overshoots the true-peak ceiling by almost 2 dB on the hits
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", str(out)], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-c:a", "libopus", "-b:a", "144k", str(webm)], check=True)
    for p in (out, webm):
        print(f"  wrote {shown(p)} ({p.stat().st_size // 1024} KB)")
    if figure:
        report.figure(mix, figure, STYLES[style].split("·", 1)[1].strip())  # the Latin half: the figure has no CJK font
        print(f"  wrote {shown(pathlib.Path(figure))}")


def main():
    parser = argparse.ArgumentParser(description="Compose the concept film's score.")
    parser.add_argument("--style", default=DEFAULT, choices=sorted(STYLES), help=f"the version to render (default: {DEFAULT})")
    parser.add_argument("--all", action="store_true", help="render every version into the directory given by --out")
    parser.add_argument("--out", help="the AAC file to write (.webm beside it); with --all, a directory")
    parser.add_argument("--wav", help="also keep the 16-bit WAV here")
    parser.add_argument("--report", help="also draw the spectrogram and the loudness against the form (PNG)")
    parser.add_argument("--list", action="store_true", help="list the versions")
    args = parser.parse_args()
    if args.list:
        for name, text in STYLES.items():
            print(f"{name:10s} {text}{'  (default)' if name == DEFAULT else ''}")
        return 0
    if args.all:
        folder = pathlib.Path(args.out or "scores")
        for style in STYLES:  # one at a time: each holds the whole film in memory
            render(style, folder / f"{style}.m4a", figure=str(folder / f"{style}.png") if args.report else None)
        return 0
    render(args.style, args.out or FILM / "score.m4a", args.wav, args.report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
