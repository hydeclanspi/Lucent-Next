"""Subset the concept film's typefaces to the characters it actually sets.

    pip install fonttools brotli && python3 scripts/film-fonts.py

Reads every character in demo/film/index.html and film.js and writes WOFF2 subsets to
demo/film/fonts/. Sources are Noto Serif CJK SC and Noto Sans CJK SC (Adobe, SIL Open Font
License 1.1) and Inter (The Inter Project Authors, SIL Open Font License 1.1); neither carries a
Reserved Font Name. Override a source path with an environment variable named after the output,
for example FILM_FONT_SERIF_LIGHT=/path/to/NotoSerifCJK-Light.ttc.

The display face, Cormorant Garamond Light and Light Italic (The Cormorant Project Authors, SIL
Open Font License 1.1), ships as its full Latin subset from @fontsource/cormorant-garamond 5.3.0:
display-light.woff2 and display-italic.woff2. Run this script again whenever the film's words change.
"""
import os
import pathlib

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILM = ROOT / "demo" / "film"
OUT = FILM / "fonts"
NOTO = "/usr/share/fonts/opentype/noto"
INTER = "/usr/share/fonts/opentype/inter"

text = (FILM / "index.html").read_text("utf-8") + (FILM / "film.js").read_text("utf-8")
used = {ch for ch in text if ord(ch) >= 0x20}
latin = {chr(c) for c in range(0x20, 0x7F)} | set("·×—–’“”↗★…″◯")
cjk = "".join(sorted(used | latin))
roman = "".join(sorted({ch for ch in used if ord(ch) < 0x3000} | latin))

# (output, source, collection index, characters)
FONTS = [
    ("serif-light", f"{NOTO}/NotoSerifCJK-Light.ttc", 2, cjk),
    ("serif-regular", f"{NOTO}/NotoSerifCJK-Regular.ttc", 2, cjk),
    ("sans-light", f"{NOTO}/NotoSansCJK-Light.ttc", 2, cjk),
    ("sans-regular", f"{NOTO}/NotoSansCJK-Regular.ttc", 2, cjk),
    ("sans-medium", f"{NOTO}/NotoSansCJK-Medium.ttc", 2, cjk),
    ("sans-bold", f"{NOTO}/NotoSansCJK-Bold.ttc", 2, cjk),
    ("latin-thin", f"{INTER}/InterDisplay-Thin.otf", None, roman),
    ("latin-light", f"{INTER}/InterDisplay-Light.otf", None, roman),
    ("latin-regular", f"{INTER}/Inter-Regular.otf", None, roman),
    ("latin-medium", f"{INTER}/Inter-Medium.otf", None, roman),
    ("latin-bold", f"{INTER}/Inter-Bold.otf", None, roman),
    ("latin-italic", f"{INTER}/InterDisplay-LightItalic.otf", None, roman),
]

OUT.mkdir(parents=True, exist_ok=True)
for name, source, number, characters in FONTS:
    source = os.environ.get("FILM_FONT_" + name.upper().replace("-", "_"), source)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["kern", "liga", "calt", "locl", "palt", "tnum"]
    options.hinting = False
    options.desubroutinize = True
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.notdef_outline = True
    if number is not None:
        options.font_number = number
    font = subset.load_font(source, options, dontLoadGlyphNames=True)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=characters)
    subsetter.subset(font)
    target = OUT / f"{name}.woff2"
    subset.save_font(font, str(target), options)
    print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB  ({len(characters)} characters)")
