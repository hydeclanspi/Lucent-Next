"""Edit the on-device recording into demo/device/lucent-on-device.mp4.

    node scripts/film-media.mjs device                            # the cover at 2x, with and without its words
    python3 scripts/device-edit.py SVID_20261019_173443_1.mp4      # the edit, its music and demo/device/poster.jpg
    python3 scripts/device-edit.py REC.mp4 --stills 3.3 7.3 28.5   # a few frames into verification/device/, to check

The recording itself (a 3120 x 2080 screen recording from the HUAWEI MatePad Edge, 1:47, silent) is not kept in
the repository. The edit opens on the cover the README shows (scripts/film-media/slot.html): its words leave and
the recording comes up in the device's screen. The device keeps its size, with only a slight lean in, so its
name stays under it throughout; the search plays at its own pace, the line of light and the page it opens
included. The quiet stretches run faster, each marked with its speed above the device's top right corner. The
recorder's own indicator, top left, is filled in from around it (ffmpeg delogo).

The music is the concept film's score from the silence before the residents to the end (fusion2, rendered
again with its sound effects muted), so the edit's 46 seconds were cut to its sections: the busiest
passage (Drive's history) runs under the score's device passage, and the camera leaves as the finale begins.
"""
import argparse
import pathlib
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
SW, SH = 3120, 2080                       # the recording
DELOGO = "delogo=x=132:y=8:w=196:h=92"    # the recorder's own indicator, top left

# (source from, source to, speed): the cut, in order
SEGMENTS = [
    (0.4, 4.0, 1), (4.0, 6.6, 4), (6.6, 10.45, 1), (10.45, 12.45, 2), (12.45, 17.4, 4), (17.4, 18.9, 1),
    (18.9, 27.8, 3), (27.8, 34.45, 4), (34.45, 40.14, 1.5), (40.14, 61.76, 4), (61.76, 66.42, 4),
    (66.42, 67.8, 2), (67.8, 74.59, 1.5), (74.59, 76.49, 2), (76.49, 82.65, 3), (82.65, 83.83, 2),
    (83.83, 87.24, 1.5), (87.24, 95.2, 3), (96.68, 102.11, 1),
]
TIMES = np.cumsum([0] + [(b - a) / s for a, b, s in SEGMENTS])   # where each segment starts in the edit
DUR = float(TIMES[-1])

# The cover (scripts/film-media/slot.html) is laid out at 1920 x 1080; the device's screen sits inside it.
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
    a, _, s = SEGMENTS[seg]
    return float(TIMES[seg] + (src_t - a) / s)


# The camera: (time, (zoom, centre x, centre y) in layout pixels); eased between keys, zoom in log space.
CAMERA = [(0.0, COVERED), (0.9, COVERED), (3.4, FULL), (DUR - 6.4, FULL), (DUR - 3.2, COVERED), (DUR, COVERED)]


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
    _, _, s = SEGMENTS[seg]
    t0, t1 = TIMES[seg], TIMES[seg + 1]
    if s == 1 or (s > 1 and t1 - t0 < 0.7):   # unmarked: real time, or a passing moment between two scenes
        return None, 0.0
    label = f"{s:g}×"
    if label not in CHIPS:
        CHIPS[label] = chip(label, "慢放" if s < 1 else "快进")
    return CHIPS[label], max(0.0, min(1.0, (t - t0) / 0.18, (t1 - t) / 0.18))


class Edit:
    def __init__(self, source, covers):
        self.source = source
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
        a, b, s = SEGMENTS[seg]
        n = int(round(TIMES[seg + 1] * FPS)) - int(round(TIMES[seg] * FPS))
        cmd = ["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-to", f"{b + 0.2:.3f}", "-i", str(self.source),
               "-vf", f"{DELOGO},setpts=(PTS-STARTPTS)/{s}," + (f"framerate=fps={FPS}" if s < 1 else f"fps={FPS}"),
               "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
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
        mark, level = chip_at(t)
        if mark is not None and level > 0:
            rgb, alpha = mark
            h, w = rgb.shape[:2]
            x0, y0 = int(MARK[0] - w), MARK[1]
            al = alpha * level
            base[y0:y0 + h, x0:x0 + w] = base[y0:y0 + h, x0:x0 + w] * (1 - al) + rgb * 255 * al
        return np.clip(base, 0, 255).astype(np.uint8)

    def still(self, t):
        seg = min(max(int(np.searchsorted(TIMES, t, side="right") - 1), 0), len(SEGMENTS) - 1)
        a, _, sp = SEGMENTS[seg]
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a + (t - TIMES[seg]) * sp:.3f}", "-i", str(self.source), "-frames:v", "1",
                              "-vf", DELOGO, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True, check=True).stdout
        return self.compose(t, np.frombuffer(raw, np.uint8).reshape(SH, SW, 3))


def music(path):
    """The film's score without its sound effects, from the silence before the residents, as long as the edit."""
    from score.clock import M, SR
    from score.styles import fusion2
    song = fusion2.compose()
    for name in ("sfx", "sfx_tuned"):
        song.mix[name].gain = -120.0
    mix, _, _ = song.render()
    a = int(round(M["dark"] * SR))
    wavfile.write(path, SR, mix[:, a:a + int(round(DUR * SR))].T.astype(np.float32))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("source", type=pathlib.Path, help="the screen recording")
    ap.add_argument("--out", type=pathlib.Path, default=ROOT / "demo/device/lucent-on-device.mp4")
    ap.add_argument("--covers", type=pathlib.Path, default=ROOT / "verification/device")
    ap.add_argument("--stills", type=float, nargs="+", help="write these moments as JPEGs instead")
    args = ap.parse_args()
    edit = Edit(args.source, args.covers)
    if args.stills:
        for t in args.stills:
            cv2.imwrite(str(args.covers / f"still-{t:05.2f}.jpg"), edit.still(t), [cv2.IMWRITE_JPEG_QUALITY, 88])
        return
    args.out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(args.out.parent / "poster.jpg"), edit.compose(0.0, None), [cv2.IMWRITE_JPEG_QUALITY, 88])
    with tempfile.TemporaryDirectory() as tmp:
        wav = f"{tmp}/music.wav"
        music(wav)
        enc = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-i", wav, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-af", f"afade=t=out:st={DUR - 1.2:.2f}:d=1.2",
               "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
               "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", "-shortest", str(args.out)]
        writer = subprocess.Popen(enc, stdin=subprocess.PIPE)
        n = 0
        for seg in range(len(SEGMENTS)):
            f0 = int(round(TIMES[seg] * FPS))
            for i, rec in enumerate(edit.frames_of(seg)):
                writer.stdin.write(edit.compose((f0 + i) / FPS, rec).tobytes())
                n += 1
                if n % 600 == 0:
                    print(f"  {n / FPS:.0f} s", flush=True)
        writer.stdin.close()
        writer.wait()
    shown = args.out.resolve().relative_to(ROOT) if args.out.resolve().is_relative_to(ROOT) else args.out
    print(f"Rendered {shown} — {n} frames, {n / FPS:.1f} s, {args.out.stat().st_size / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
