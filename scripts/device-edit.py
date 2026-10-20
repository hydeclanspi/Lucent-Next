"""Edit the on-device recordings into demo/device/lucent-on-device.mp4.

    node scripts/film-media.mjs device                                  # the cover at 2x, with and without its words
    python3 scripts/device-edit.py SVID_20261019_173443_1.mp4 SVID_20261020_131207_1.mp4    # the edit, its music, the poster
    python3 scripts/device-edit.py A.mp4 B.mp4 --head demo/device/lucent-on-device.mp4    # re-cut the end only (below)
    python3 scripts/device-edit.py A.mp4 B.mp4 --stills 3.3 7.3 40.2     # a few frames into verification/device/, to check

The recordings (3120 x 2080 screen recordings from the HUAWEI MatePad Edge, silent) are not kept in the repository:
the first (1:47) runs from the search to the backup, the second (0:26) from the search box as it was to the
gold silk of 5.1.3 and the folded card. The edit opens on its own cover (scripts/film-media/slot.html): its words
leave and the first recording comes up in the device's screen. The device keeps its size, with only a
slight lean in, so its name stays under it throughout; the search plays at its own pace, the line of light and the
page it opens included. The quiet stretches run faster, each marked with its speed above the device's top right
corner. After the backup the second recording takes over, and the camera goes into the screen as the README's
animation does (scripts/device-clip.py): the search box, a tap on 理, the loop switched on at the panel's top right,
the silk round the box, a query typed, and the whole card folding into focus, as the camera leaves. Its taps are
marked with rings, since the recordings show none. The recorder's own indicator, top left, is filled in from around
it (ffmpeg delogo).

The music is the concept film's score from the silence before the residents to the end (fusion2, rendered again with
its sound effects muted), cut to the edit at bar lines (MUSIC): one bar less where the wallpaper panel waits, and,
where the finale would have begun, the score goes back ten seconds, so the quiet passage plays under the silk and the
finale arrives as the card folds and the camera leaves.

--head takes everything before the second recording from an earlier render of this edit (the frames in HEAD)
instead of composing it again; the rest, the music and the encode are as in a full render.
"""
import argparse
import pathlib
import shutil
import subprocess
import sys
import tempfile

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.io import wavfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

FPS, W, H = 60, 2560, 1440
SW, SH = 3120, 2080                       # both recordings
DELOGO = "delogo=x=132:y=8:w=196:h=92"    # the recorder's own indicator, top left, in both

# (recording, source from, source to, speed): the cut, in order. 0 is the first recording, 1 the second.
SEGMENTS = [
    (0, 0.4, 4.0, 1), (0, 4.0, 6.6, 4), (0, 6.6, 12.45, 1), (0, 12.45, 17.4, 4), (0, 17.4, 18.9, 1),
    (0, 18.9, 27.8, 3), (0, 27.8, 34.45, 4), (0, 34.45, 40.14, 1.5), (0, 40.14, 61.76, 4), (0, 61.76, 66.42, 4),
    (0, 66.42, 67.8, 2),
    (0, 67.8, 68.525, 1.5), (0, 71.525, 74.59, 1.5),   # the wallpaper panel, its wait one bar shorter
    (0, 74.59, 76.49, 2), (0, 76.49, 82.65, 3), (0, 82.65, 83.83, 2), (0, 83.83, 87.24, 1.5),
    (1, 3.75, 4.85, 1),       # the search box as it was; 理 at 4.74
    (1, 4.85, 6.0, 2), (1, 6.0, 6.7, 1),               # the panel; the loop switched on at 6.15
    (1, 6.7, 7.6, 3), (1, 7.6, 12.0, 1),               # the panel closes: the silk and the motes
    (1, 12.0, 16.6, 2.5), (1, 16.6, 19.5, 1.5),        # a query typed under the silk
    (1, 19.5, 25.735, 1),     # the card folds into focus (19.7) on the finale's downbeat; the camera leaves
]
TIMES = np.cumsum([0] + [(b - a) / s for _, a, b, s in SEGMENTS])   # where each segment starts in the edit
DUR = float(TIMES[-1])
# The score in seconds after the mark "dark", as (from, to) pieces joined at bar lines: the bar at 28.5 goes with
# the panel's wait; at 40, where the finale begins, it goes back to 30 (the groove, the fall, the quiet, the rise).
MUSIC = [(0.0, 28.5), (30.5, 40.0), (30.0, 46.0)]
JOIN = 0.06                                # each join is an equal-power crossfade ending on the bar line
# --head: the earlier render's frames (at 60 fps) that make everything before the second recording
HEAD = [(0, 1740), (1860, 2335)]

# The recording's opening frame (scripts/film-media/slot.html) is laid out at 1920 x 1080; the device's screen sits inside it.
DEVICE = (402, 152, 1518, 904)
SCREEN = (414, 164, 1506, 892)            # 3:2, like the recording
RADIUS = 34
K = (SCREEN[2] - SCREEN[0]) / SW          # recording pixel -> layout pixel
OY = SCREEN[1] + ((SCREEN[3] - SCREEN[1]) - SH * K) / 2
S = W / 1920                              # layout pixel -> output pixel at zoom 1
COVERED = (1.0, 960.0, 540.0)
FULL = (1.08, 960.0, (DEVICE[1] + DEVICE[3]) / 2)        # a slight lean in: the device keeps its size and its name
# where the speed mark sits: above the device, flush with its right edge
MARK = (W / 2 + (DEVICE[2] - FULL[1]) * FULL[0] * S, int(H / 2 + (DEVICE[1] - FULL[2]) * FULL[0] * S) - 30 - 56)


def ease(u):
    return u * u * (3 - 2 * u)


def at(seg, src_t):
    """Where a moment of the recording falls in the edit."""
    _, a, _, s = SEGMENTS[seg]
    return float(TIMES[seg] + (src_t - a) / s)


def when(rec, src_t):
    """Where a moment of a recording falls in the edit."""
    seg = next(i for i, (r, a, b, _) in enumerate(SEGMENTS) if r == rec and a <= src_t <= b)
    return at(seg, src_t)


def on_screen(x, y, w):
    """A framing inside the screen: centre (x, y) and width w in recording pixels, as a camera key."""
    return 1920 / (w * K), SCREEN[0] + x * K, OY + y * K


SECOND = float(TIMES[next(i for i, seg in enumerate(SEGMENTS) if seg[0] == 1)])   # where the second recording starts
# In the second recording the camera goes into the screen, as the README's animation does (scripts/device-clip.py):
BOX = on_screen(2006, 900, 1900)           # the search card's top: the box, 理, the engines
CORNER = on_screen(1960, 410, 1450)        # the panel's top right: the loop's switch and the arrow pointing at it
CLOSE = on_screen(2006, 940, 1700)         # the box, closer, for the silk
CARD = on_screen(2006, 1100, 2200)         # the whole card, to watch it fold
# The camera: (time, (zoom, centre x, centre y) in layout pixels); eased between keys, zoom in log space.
CAMERA = [(0.0, COVERED), (0.9, COVERED), (3.4, FULL), (SECOND, FULL), (SECOND + 0.8, BOX), (when(1, 4.85), BOX),
          (when(1, 5.9), CORNER), (when(1, 7.62), CORNER), (when(1, 8.05), BOX), (when(1, 12.0), CLOSE),
          (when(1, 16.6), CLOSE), (when(1, 19.3), CARD), (when(1, 20.05), CARD), (DUR - 2.6, COVERED), (DUR, COVERED)]
# (recording, source time, x, y): a finger on the screen, marked with a ring, since the recordings show none
TAPS = [(1, 4.74, 2699, 896), (1, 6.14, 2240, 382), (1, 19.58, 2716, 1150)]


def camera(t):
    for (t0, a), (t1, b) in zip(CAMERA, CAMERA[1:]):
        if t0 <= t <= t1:
            u = ease((t - t0) / (t1 - t0)) if t1 > t0 else 1.0
            z = float(np.exp(np.log(a[0]) + (np.log(b[0]) - np.log(a[0])) * u))
            return z, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u
    return CAMERA[-1][1]


def chip(text, word):
    """The speed mark: a small dark glass pill, set at 2x and scaled down."""
    scale = 2
    f_big = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Medium.otf", 30 * scale)
    f_cjk = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 22 * scale, index=2)
    pad, gap = 22 * scale, 10 * scale
    wn, ww = f_big.getlength(text), f_cjk.getlength(word)
    w, h = int(pad * 2 + wn + gap + ww), 56 * scale
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=(20, 26, 40, 168), outline=(255, 255, 255, 70), width=scale)
    d.text((pad, h / 2), text, font=f_big, fill=(244, 246, 250, 255), anchor="lm")
    d.text((pad + wn + gap, h / 2 + scale), word, font=f_cjk, fill=(226, 232, 242, 210), anchor="lm")
    a = np.asarray(im.resize((w // scale, h // scale), Image.LANCZOS)).astype(np.float32) / 255
    return a[..., [2, 1, 0]], a[..., 3:4]


CHIPS = {}


def chip_at(t):
    seg = min(max(int(np.searchsorted(TIMES, t, side="right") - 1), 0), len(SEGMENTS) - 1)
    s = SEGMENTS[seg][3]
    first, last = seg, seg                  # a run of segments at one speed carries one mark
    while first > 0 and SEGMENTS[first - 1][3] == s:
        first -= 1
    while last < len(SEGMENTS) - 1 and SEGMENTS[last + 1][3] == s:
        last += 1
    t0, t1 = TIMES[first], TIMES[last + 1]
    if s == 1 or (s > 1 and t1 - t0 < 0.7):   # unmarked: real time, or a passing moment between two scenes
        return None, 0.0
    label = f"{s:g}×"
    if label not in CHIPS:
        CHIPS[label] = chip(label, "慢放" if s < 1 else "快进")
    return CHIPS[label], max(0.0, min(1.0, (t - t0) / 0.18, (t1 - t) / 0.18))


def ring(base, px, py, age):
    """A tap: a white ring that widens and fades over 0.55 s, over a soft shadow so it reads on light glass too."""
    u = age / 0.55
    r = 28 + 56 * ease(min(1.0, u * 1.4))
    alpha = (1 - u) ** 1.4
    pad = 120
    x0, y0 = max(0, int(px) - pad), max(0, int(py) - pad)
    x1, y1 = min(W, int(px) + pad), min(H, int(py) + pad)
    if x1 <= x0 or y1 <= y0:
        return base
    shape = np.zeros((y1 - y0, x1 - x0), np.float32)
    c = (int(round((px - x0) * 4)), int(round((py - y0) * 4)))
    cv2.circle(shape, c, int(r * 4), 0.9, 6, cv2.LINE_AA, shift=2)
    if age < 0.2:
        cv2.circle(shape, c, 28 * 4, 0.32 * (1 - age / 0.2), -1, cv2.LINE_AA, shift=2)
    shade = (cv2.GaussianBlur(shape, (0, 0), 6) * 0.35 * alpha)[..., None]
    k = (shape * alpha)[..., None]
    patch = base[y0:y1, x0:x1]
    base[y0:y1, x0:x1] = patch * (1 - shade) * (1 - k) + 255 * k
    return base


class Edit:
    def __init__(self, sources, covers):
        self.sources = sources
        self.cover = cv2.imread(str(covers / "cover-2x.png"))
        self.bare = cv2.imread(str(covers / "cover-bare-2x.png"))       # the same, its screen dark and empty
        if self.cover is None or self.bare is None:
            raise SystemExit("Render the covers first: node scripts/film-media.mjs device")
        m = np.zeros((2160, 3840), np.uint8)
        x0, y0, x1, y1 = [v * 2 for v in SCREEN]
        r = RADIUS * 2
        cv2.rectangle(m, (x0 + r, y0), (x1 - r, y1), 255, -1)
        cv2.rectangle(m, (x0, y0 + r), (x1, y1 - r), 255, -1)
        for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
            cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
        self.mask = m.astype(np.float32) / 255

    def frames_of(self, seg):
        """The segment's frames, retimed by ffmpeg: exactly as many as the edit needs."""
        rec, a, b, s = SEGMENTS[seg]
        n = int(round(TIMES[seg + 1] * FPS)) - int(round(TIMES[seg] * FPS))
        cmd = ["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-to", f"{b + 0.2:.3f}", "-i", str(self.sources[rec]),
               "-vf", f"{DELOGO},setpts=(PTS-STARTPTS)/{s}," + (f"framerate=fps={FPS}" if s < 1 else f"fps={FPS}"),
               "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        size, last = SW * SH * 3, None
        for _ in range(n):
            buf = p.stdout.read(size)
            if len(buf) == size:
                last = np.frombuffer(buf, np.uint8).reshape(SH, SW, 3)
            yield last
        p.stdout.close()
        p.kill()
        p.wait()

    def compose(self, t, rec):
        z, cx, cy = camera(t)
        a = z * S / 2                                    # the 2x cover through the camera
        m_cover = np.float32([[a, 0, W / 2 - cx * z * S], [0, a, H / 2 - cy * z * S]])
        # the cover's words and play button leave first; then the recording comes up in the screen
        u = ease(min(1.0, max(0.0, (t - 0.25) / 0.45)))
        cover = self.cover if u <= 0 else self.bare if u >= 1 else cv2.addWeighted(self.cover, 1 - u, self.bare, u, 0)
        base = cv2.warpAffine(cover, m_cover, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        mask = cv2.warpAffine(self.mask, m_cover, (W, H), flags=cv2.INTER_LINEAR)
        fade = ease(min(1.0, max(0.0, (t - 0.65) / 0.6)))
        if fade > 0 and rec is not None:
            b = K * z * S                                # recording pixel -> output pixel
            tx, ty = (SCREEN[0] - cx) * z * S + W / 2, (OY - cy) * z * S + H / 2
            if b < 1:
                w2, h2 = max(1, round(SW * b)), max(1, round(SH * b))
                small = cv2.resize(rec, (w2, h2), interpolation=cv2.INTER_AREA)
                layer = cv2.warpAffine(small, np.float32([[b * SW / w2, 0, tx], [0, b * SH / h2, ty]]), (W, H), flags=cv2.INTER_LINEAR)
            else:
                layer = cv2.warpAffine(rec, np.float32([[b, 0, tx], [0, b, ty]]), (W, H), flags=cv2.INTER_CUBIC)
            k = (mask * fade)[..., None]
            base = base * (1 - k) + layer.astype(np.float32) * k
        for rec_i, src_t, x, y in TAPS:
            age = t - when(rec_i, src_t)
            if 0 <= age < 0.55 and rec is not None:
                b = K * z * S
                px = (SCREEN[0] - cx) * z * S + W / 2 + x * b
                py = (OY - cy) * z * S + H / 2 + y * b
                base = ring(base, px, py, age)
        mark, level = chip_at(t)
        if mark is not None and level > 0:
            rgb, alpha = mark
            h, w = rgb.shape[:2]
            # above the device's top right corner; inside the frame when the camera is in the screen
            right = min(W - 44, (DEVICE[2] - cx) * z * S + W / 2)
            top = max(44, (DEVICE[1] - cy) * z * S + H / 2 - 30 - h)
            x0, y0 = int(right - w), int(top)
            al = alpha * level
            base[y0:y0 + h, x0:x0 + w] = base[y0:y0 + h, x0:x0 + w] * (1 - al) + rgb * 255 * al
        return np.clip(base, 0, 255).astype(np.uint8)

    def still(self, t):
        seg = min(max(int(np.searchsorted(TIMES, t, side="right") - 1), 0), len(SEGMENTS) - 1)
        rec, a, _, sp = SEGMENTS[seg]
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a + (t - TIMES[seg]) * sp:.3f}", "-i", str(self.sources[rec]), "-frames:v", "1",
                              "-vf", DELOGO, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True, check=True).stdout
        return self.compose(t, np.frombuffer(raw, np.uint8).reshape(SH, SW, 3))


def music(path):
    """The film's score without its sound effects, from the silence before the residents, cut to the edit (MUSIC)."""
    from score.clock import M, SR
    from score.styles import fusion2
    song = fusion2.compose()
    for name in ("sfx", "sfx_tuned"):
        song.mix[name].gain = -120.0
    mix, _, _ = song.render()
    zero, n = int(round(M["dark"] * SR)), int(round(JOIN * SR))
    out = None
    for a, b in MUSIC:
        i, j = zero + int(round(a * SR)), zero + int(round(b * SR))
        if out is None:
            out = mix[:, i:j]
            continue
        u = np.linspace(0, np.pi / 2, n)
        tail = out[:, -n:] * np.cos(u) + mix[:, i - n:i] * np.sin(u)   # what leads into the bar, from both sides
        out = np.concatenate([out[:, :-n], tail, mix[:, i:j]], axis=1)
    assert abs(out.shape[1] / SR - DUR) < 1 / FPS, (out.shape[1] / SR, DUR)
    wavfile.write(path, SR, out.T.astype(np.float32))


def head_frames(path):
    """The earlier render's frames listed in HEAD, in order."""
    size = W * H * 3
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    index = 0
    for a, b in HEAD:
        while index < b:
            buf = p.stdout.read(size)
            if len(buf) < size:
                raise SystemExit(f"{path} ends at frame {index}; --head needs frames up to {HEAD[-1][1]}")
            if index >= a:
                yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)
            index += 1
    p.stdout.close()
    p.kill()
    p.wait()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("sources", type=pathlib.Path, nargs=2, help="the two screen recordings, in order")
    ap.add_argument("--out", type=pathlib.Path, default=ROOT / "demo/device/lucent-on-device.mp4")
    ap.add_argument("--covers", type=pathlib.Path, default=ROOT / "verification/device")
    ap.add_argument("--head", type=pathlib.Path, help="an earlier render: take its frames in HEAD for the first recording's part")
    ap.add_argument("--stills", type=float, nargs="+", help="write these moments as JPEGs instead")
    args = ap.parse_args()
    edit = Edit(args.sources, args.covers)
    if args.stills:
        for t in args.stills:
            cv2.imwrite(str(args.covers / f"still-{t:05.2f}.jpg"), edit.still(t), [cv2.IMWRITE_JPEG_QUALITY, 88])
        return
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if not args.head:
        cv2.imwrite(str(args.out.parent / "poster.jpg"), edit.compose(0.0, None), [cv2.IMWRITE_JPEG_QUALITY, 88])
    second = next(i for i, seg in enumerate(SEGMENTS) if seg[0] == 1)
    with tempfile.TemporaryDirectory() as tmp:
        wav, mp4 = f"{tmp}/music.wav", f"{tmp}/edit.mp4"
        music(wav)
        enc = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-i", wav, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-af", f"afade=t=out:st={DUR - 1.2:.2f}:d=1.2",
               "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
               "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", "-shortest", mp4]
        writer = subprocess.Popen(enc, stdin=subprocess.PIPE)
        n = 0
        if args.head:
            for frame in head_frames(args.head):
                writer.stdin.write(frame.tobytes())
                n += 1
            assert n == int(round(TIMES[second] * FPS)), (n, TIMES[second] * FPS)
            print(f"  {n / FPS:.2f} s from {args.head.name}", flush=True)
        for seg in range(second if args.head else 0, len(SEGMENTS)):
            f0 = int(round(TIMES[seg] * FPS))
            for i, rec in enumerate(edit.frames_of(seg)):
                writer.stdin.write(edit.compose((f0 + i) / FPS, rec).tobytes())
                n += 1
                if n % 600 == 0:
                    print(f"  {n / FPS:.0f} s", flush=True)
        writer.stdin.close()
        writer.wait()
        shutil.move(mp4, args.out)
    shown = args.out.resolve().relative_to(ROOT) if args.out.resolve().is_relative_to(ROOT) else args.out
    print(f"Rendered {shown} — {n} frames, {n / FPS:.1f} s, {args.out.stat().st_size / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
