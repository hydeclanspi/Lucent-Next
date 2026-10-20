"""Cut the README's on-device animation, demo/media/search-aura.webp, from a MatePad recording.

    python3 scripts/device-clip.py SVID_20261020_131207_1.mp4
    python3 scripts/device-clip.py REC.mp4 --stills 0.5 2.4 3.4 6.0   # a few frames into verification/device/, to check

The recording (3120 x 2080 from the HUAWEI MatePad Edge, 26 s, the author's own) is not kept in the repository.
The animation follows one tap at a time: the search box as it is, a tap on 理, the 念起，光行 panel and its
top right corner, where 无限模拟发射循环 is switched on, and the search box again, now with the gold silk
running round it and the motes rising. The camera is a crop of the recording, eased between framings; the
waits run a little faster, and each tap is marked with a ring, since the device shows none.
"""
import argparse
import pathlib
import subprocess

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SW, SH = 3120, 2080                       # the recording
W, H, FPS = 1200, 660, 25                 # the animation, as wide as the README's others
SRC_FPS = 60                              # the recording is decoded at this constant rate first
FIRST = 3.0                               # where decoding starts in the recording

# (source from, source to, speed): the cut, in order
SEGMENTS = [
    (3.2, 4.85, 1),      # the search box as it is; 理 is tapped at 4.74
    (4.85, 5.25, 1),     # the panel opens
    (5.25, 6.0, 2),
    (6.0, 6.95, 1),      # 无限模拟发射循环, switched on at 6.14
    (6.95, 7.6, 2.5),
    (7.6, 8.1, 1),       # the panel closes
    (8.1, 11.8, 1),      # the silk and the motes
]
TIMES = np.cumsum([0] + [(b - a) / s for a, b, s in SEGMENTS])
DUR = float(TIMES[-1])

# Framings in recording pixels: (centre x, centre y, width); the height follows from the animation's shape.
BOX = (2006.0, 900.0, 1800.0)             # the search card's top: the box, 理, the engines
CORNER = (2080.0, 400.0, 1250.0)          # the panel's top right: the switch and the arrow pointing at it
CLOSE = (2006.0, 850.0, 1600.0)           # the box again, a little closer
# (source time, framing): eased between keys, the width in log space
CAMERA = [(3.2, BOX), (4.85, BOX), (5.9, CORNER), (7.62, CORNER), (8.15, BOX), (11.8, CLOSE)]
# (source time, x, y): where a finger touched the screen
TAPS = [(4.74, 2699, 896), (6.14, 2240, 382)]


def ease(u):
    return u * u * (3 - 2 * u)


def at(src_t):
    """Where a moment of the recording falls in the animation."""
    for i, (a, b, s) in enumerate(SEGMENTS):
        if src_t <= b or i == len(SEGMENTS) - 1:
            return float(TIMES[i] + (max(src_t, a) - a) / s)


def source(t):
    """The moment of the recording shown at time t of the animation."""
    i = min(int(np.searchsorted(TIMES, t, side="right") - 1), len(SEGMENTS) - 1)
    a, _, s = SEGMENTS[i]
    return a + (t - TIMES[i]) * s


KEYS = [(at(s), f) for s, f in CAMERA]


def camera(t):
    for (t0, a), (t1, b) in zip(KEYS, KEYS[1:]):
        if t0 <= t <= t1:
            u = ease((t - t0) / (t1 - t0)) if t1 > t0 else 1.0
            w = float(np.exp(np.log(a[2]) + (np.log(b[2]) - np.log(a[2])) * u))
            return a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, w
    return KEYS[-1][1] if t > KEYS[-1][0] else KEYS[0][1]


def compose(t, rec):
    cx, cy, w = camera(t)
    s = W / w
    # crop at twice the size, then down with area averaging, so the move stays smooth and the text sharp
    m = np.float32([[2 * s, 0, W - cx * 2 * s], [0, 2 * s, H - cy * 2 * s]])
    big = cv2.warpAffine(rec, m, (2 * W, 2 * H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    out = cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
    for src_t, x, y in TAPS:
        age = t - at(src_t)
        if 0 <= age < 0.55:
            px, py = (x - cx) * s + W / 2, (y - cy) * s + H / 2
            u = age / 0.55
            r = 13 + 26 * ease(min(1.0, u * 1.4))
            alpha = (1 - u) ** 1.4
            # a white ring that widens and fades, over a soft shadow so it reads on the light glass too
            ring = np.zeros(out.shape[:2], np.float32)
            c = (int(round(px * 4)), int(round(py * 4)))
            cv2.circle(ring, c, int(r * 4), 0.9, 3, cv2.LINE_AA, shift=2)
            if age < 0.2:
                cv2.circle(ring, c, 13 * 4, 0.32 * (1 - age / 0.2), -1, cv2.LINE_AA, shift=2)
            shade = cv2.GaussianBlur(ring, (0, 0), 3) * 0.35 * alpha
            k = (ring * alpha)[..., None]
            out = out * (1 - shade[..., None]) * (1 - k) + 255 * k
    return np.clip(out, 0, 255).astype(np.uint8)


def frames(path, times):
    """The recording at the given source times (in order), decoded once at a constant rate."""
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{FIRST:.3f}", "-to", f"{max(times) + 0.2:.3f}", "-i", str(path),
           "-vf", f"fps={SRC_FPS}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    size, index, frame = SW * SH * 3, -1, None
    for src_t in times:
        want = int(round((src_t - FIRST) * SRC_FPS))
        while index < want:
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            frame, index = np.frombuffer(buf, np.uint8).reshape(SH, SW, 3), index + 1
        yield frame
    p.stdout.close()
    p.kill()
    p.wait()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("source", type=pathlib.Path, help="the screen recording")
    ap.add_argument("--out", type=pathlib.Path, default=ROOT / "demo/media/search-aura.webp")
    ap.add_argument("--stills", type=float, nargs="+", help="write these moments as JPEGs into verification/device/ instead")
    args = ap.parse_args()
    if args.stills:
        out = ROOT / "verification/device"
        for t, rec in zip(sorted(args.stills), frames(args.source, [source(t) for t in sorted(args.stills)])):
            cv2.imwrite(str(out / f"aura-{t:05.2f}.jpg"), compose(t, rec), [cv2.IMWRITE_JPEG_QUALITY, 90])
        return
    n = int(round(DUR * FPS))
    times = [i / FPS for i in range(n)]
    shots = [Image.fromarray(compose(t, rec)[..., ::-1]) for t, rec in zip(times, frames(args.source, [source(t) for t in times]))]
    # A key frame every third frame: between key frames libwebp keeps any 8 x 8 block that changed only a little,
    # and under a moving camera those kept blocks show as squares in the wallpaper's blur.
    shots[0].save(args.out, save_all=True, append_images=shots[1:], duration=1000 // FPS, loop=0,
                  quality=85, method=4, kmin=2, kmax=3)
    print(f"Rendered {args.out.relative_to(ROOT)} — {n} frames, {DUR:.1f} s, {args.out.stat().st_size / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
