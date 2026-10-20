"""Give the web edition the MatePad's own typefaces.

    pip install fonttools brotli
    python3 scripts/web-fonts.py --sc DIR --latin HarmonyOS_Sans.ttf --italic HarmonyOS_Sans_Italic.ttf \
        --mono noto-sans-mono-latin-wght-normal.woff2

On the MatePad Edge the page is set in the system's HarmonyOS Sans, and its monospace is Noto Sans
Mono; a computer has neither, so it fell back to PingFang, SF and Songti. This script writes the
fonts the web edition carries instead, and the stylesheet that declares them, to src/fonts/:

  Lucent Sans   Latin, Greek and Cyrillic from HarmonyOS Sans 2.04, the variable font in OpenHarmony's
                system resources (global_system_resources/fonts/HarmonyOS_Sans.ttf and
                HarmonyOS_Sans_Italic.ttf), so every weight from 100 to 900 is the device's own.
                Chinese from HarmonyOS Sans SC 1.0 Regular, Medium, Bold and Black (the HarmonyOS
                Sans download, also on npm as harmonyos-sans@1.0.0): the device's SC is variable, but
                its file is not published, so each weight the page asks for is served by the nearest
                static cut — 600 by Medium, as it measures on the device's screen.
  Lucent Mono   Noto Sans Mono, variable (@fontsource-variable/noto-sans-mono 5.3.0, Latin; SIL Open
                Font License 1.1), copied as published.

Chinese is cut in slices. The core slice holds every character the product sets itself, CJK and
full-width punctuation and the 3,755 characters of GB 2312 level 1, about 490 KB a weight; it loads
with the page. The other 24,000-odd characters of SC follow in slices of 400 (about 65 KB), GB 2312
level 2 first, each fetched only when a character in it first appears. Latin characters whose glyph
SC draws differently (its full-width quotation marks, for example) stay with SC, as on the device.

Glyph outlines are kept as drawn; the files only lose characters, hinting and their TrueType
container. Run this again whenever the product's own words change.
"""
import argparse
import pathlib
import shutil

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
OUT = SRC / "fonts"

# Static cut -> (file key, the weights it serves). Measured against the device: 600 is drawn closer
# to Medium than to Bold, 650 closer to Bold, 800 between Bold and Black.
CUTS = [("Regular", 400, "1 450"), ("Medium", 500, "451 649"), ("Bold", 700, "650 799"), ("Black", 900, "800 1000")]
SLICE = 400


def product_text():
    words = []
    for path in sorted(SRC.rglob("*")):
        if path.is_file() and path.suffix in {".html", ".js", ".css", ".json", ".webmanifest"} and OUT not in path.parents:
            words.append(path.read_text("utf-8", errors="ignore"))
    return {ord(ch) for ch in "".join(words) if ord(ch) >= 0x80}


def gb2312(rows):
    out = set()
    for hi in rows:
        for lo in range(0xA1, 0xFF):
            try:
                out.add(ord(bytes([hi, lo]).decode("gb2312")))
            except UnicodeDecodeError:
                pass
    return out


def runs(points):
    out = []
    for cp in sorted(points):
        if out and cp == out[-1][1] + 1:
            out[-1][1] = cp
        else:
            out.append([cp, cp])
    return ",".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in out)


def write(source, points, target, variable=False):
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.hinting = False
    options.notdef_outline = True
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.name_languages = ["*"]
    font = subset.load_font(str(source), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=sorted(points))
    subsetter.subset(font)
    subset.save_font(font, str(target), options)
    return target.stat().st_size


def glyph_metrics(font, cp):
    name = font.getBestCmap()[cp]
    glyph = font["glyf"][name]
    box = (glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax) if glyph.numberOfContours else None
    return font["hmtx"][name][0], box


def same_drawing(sc, latin, cp):
    """SC and the Latin family share their Latin design; a few marks SC draws its own way."""
    (aw, ab), (bw, bb) = glyph_metrics(sc, cp), glyph_metrics(latin, cp)
    if aw != bw:
        return False
    if ab is None or bb is None:
        return ab is None and bb is None
    return all(abs(x - y) <= 24 for x, y in zip(ab, bb))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--sc", required=True, type=pathlib.Path, help="folder with HarmonyOS_Sans_SC_{Regular,Medium,Bold,Black}.ttf and LICENSE.txt")
    parser.add_argument("--latin", required=True, type=pathlib.Path, help="HarmonyOS_Sans.ttf, the variable font from OpenHarmony")
    parser.add_argument("--italic", required=True, type=pathlib.Path, help="HarmonyOS_Sans_Italic.ttf, the variable font from OpenHarmony")
    parser.add_argument("--mono", required=True, type=pathlib.Path, help="noto-sans-mono-latin-wght-normal.woff2")
    parser.add_argument("--mono-license", type=pathlib.Path, help="the Noto Sans Mono package's LICENSE (OFL)")
    args = parser.parse_args()

    regular = TTFont(str(args.sc / "HarmonyOS_Sans_SC_Regular.ttf"))
    latin = TTFont(str(args.latin))
    italic = TTFont(str(args.italic))
    sc_points = set(regular.getBestCmap())
    latin_points = set(latin.getBestCmap())
    italic_points = set(italic.getBestCmap())

    # Latin faces: what the Latin family draws exactly as SC does, and what SC lacks.
    shared = {cp for cp in latin_points & sc_points if same_drawing(regular, latin, cp)}
    latin_face = (latin_points - sc_points) | shared
    italic_face = italic_points & (latin_face | (italic_points - sc_points))

    blocks = set(range(0x20, 0x250)) | set(range(0x2000, 0x2070)) | set(range(0x3000, 0x3040)) | \
        set(range(0xFE30, 0xFE50)) | set(range(0xFF00, 0xFFF0))
    core = ((blocks | product_text() | gb2312(range(0xB0, 0xD8))) & sc_points) - latin_face
    level2 = gb2312(range(0xD8, 0xF8))
    rest = sc_points - core - latin_face
    order = sorted(rest & level2) + sorted(rest - level2)
    slices = [order[i:i + SLICE] for i in range(0, len(order), SLICE)]

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    total = {}
    css = [
        "/* Generated by scripts/web-fonts.py; do not edit. The MatePad's typefaces for the web edition:",
        "   Lucent Sans is HarmonyOS Sans (HarmonyOS Sans Fonts License Agreement, HarmonyOS-Sans-LICENSE.txt),",
        "   Lucent Mono is Noto Sans Mono (SIL Open Font License 1.1, Noto-Sans-Mono-OFL.txt).",
        "   The rare-character slices come first and the core last: a browser checks the last face first. */",
    ]

    def face(family, weight, file, points=None, style="normal", display="block", variable=False):
        src = f'url("./{file}") format("woff2-variations"), ' if variable else ""
        rule = f'@font-face {{ font-family: "{family}"; font-style: {style}; font-weight: {weight}; font-display: {display}; ' \
               f'src: {src}url("./{file}") format("woff2");'
        if points is not None:
            rule += f" unicode-range: {runs(points)};"
        css.append(rule + " }")

    for index, chars in enumerate(slices, 1):
        for cut, key, weights in CUTS:
            name = f"sans-{key}-{index:02d}.woff2"
            total[key] = total.get(key, 0) + write(args.sc / f"HarmonyOS_Sans_SC_{cut}.ttf", chars, OUT / name)
            face("Lucent Sans", weights, name, chars, display="swap")
    sizes = {}
    for cut, key, weights in CUTS:
        name = f"sans-{key}.woff2"
        sizes[name] = write(args.sc / f"HarmonyOS_Sans_SC_{cut}.ttf", core, OUT / name)
        face("Lucent Sans", weights, name)
    # A browser composes a family from faces with identical descriptors only, so the variable Latin
    # face is declared once for each weight band (one file, fetched once) and set at the exact weight.
    sizes["sans-latin.woff2"] = write(args.latin, latin_face, OUT / "sans-latin.woff2")
    for cut, key, weights in CUTS:
        face("Lucent Sans", weights, "sans-latin.woff2", latin_face, variable=True)
    # Italic: the device's HarmonyOS Sans Italic for Latin, which is all the product sets in italic.
    sizes["sans-latin-italic.woff2"] = write(args.italic, italic_face, OUT / "sans-latin-italic.woff2")
    for cut, key, weights in CUTS:
        face("Lucent Sans", weights, f"sans-{key}.woff2", style="italic")
        face("Lucent Sans", weights, "sans-latin-italic.woff2", italic_face, style="italic", variable=True)
    shutil.copyfile(args.mono, OUT / "mono.woff2")
    sizes["mono.woff2"] = (OUT / "mono.woff2").stat().st_size
    face("Lucent Mono", "1 1000", "mono.woff2", set(TTFont(str(args.mono)).getBestCmap()), variable=True)

    (OUT / "fonts.css").write_text("\n".join(css) + "\n", "utf-8")
    shutil.copyfile(args.sc / "LICENSE.txt", OUT / "HarmonyOS-Sans-LICENSE.txt")
    if args.mono_license:
        shutil.copyfile(args.mono_license, OUT / "Noto-Sans-Mono-OFL.txt")

    for name, size in sizes.items():
        print(f"src/fonts/{name}  {size // 1024} KB")
    print(f"core: {len(core)} characters; {len(slices)} slices of up to {SLICE} for the other {len(order)}")
    for key, size in total.items():
        print(f"  slices at {key}: {size // 1024} KB in all")
    print(f"src/fonts/fonts.css  {(OUT / 'fonts.css').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
