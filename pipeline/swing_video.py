#!/usr/bin/env python3
"""
Turn a real swing clip into the looping silhouette the game plays.

    .venv/bin/python swing_video.py

Reads every clip in `clips/`, named after the player id it belongs to
(`tiger-woods.mp4`), and writes to `../public/swings/<id>/`:

    1.mp4 … 3.mp4   silhouette loops, coarse → fine
    4.mp4           the source clip, for the final reveal
    poster.jpg      first-frame poster so the panel never flashes empty

Pipeline: ffmpeg pulls frames → rembg segments the golfer per frame → the masks
are smoothed over time to kill flicker → a stable crop is taken across the whole
clip → the silhouette is filled with a halftone pattern on black → ffmpeg
encodes it back to a loopable MP4.

Optional per-clip overrides live in `clips.json`:

    { "tiger-woods": { "start": 2.5, "duration": 2.0, "flip": false } }

`start`/`duration` trim to the swing itself; `flip` mirrors a clip shot from
the far side so every golfer faces the same way.

See README.md for the licensing constraints on source footage. This script
does not acquire clips and will not download anything — point it at footage you
have the rights to use.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm", ".avi"}

# Output geometry. Height is fixed so every golfer is framed identically —
# relative size is a clue about the player, and an inconsistent crop turns the
# puzzle into a test of how the clip happened to be shot.
OUT_HEIGHT = 520
OUT_WIDTH = 400
FPS = 20
DEFAULT_DURATION = 2.4

# Halftone settings per reveal stage: coarse dots hide the swing's finer detail,
# fine dots show wrist and club positions clearly.
STAGE_STYLES = {
    1: {"spacing": 13, "radius": 4.6, "mask_blur": 3.0},
    2: {"spacing": 9, "radius": 3.2, "mask_blur": 1.5},
    3: {"spacing": 6, "radius": 2.2, "mask_blur": 0.0},
}

# Dot colours, cycled across the grid — the reference site's palette reads as a
# CRT/halftone texture rather than a flat fill.
DOT_COLORS = [(86, 180, 233), (120, 200, 140), (232, 205, 90)]
BACKGROUND = (0, 0, 0)

MASK_THRESHOLD = 100


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def probe_duration(path: Path) -> float:
    out = run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ]
    ).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def extract_frames(clip: Path, dest: Path, start: float, duration: float, flip: bool) -> list[Path]:
    """Pull evenly spaced frames, scaled so the golfer fills a consistent height."""
    dest.mkdir(parents=True, exist_ok=True)
    for old in dest.glob("*.png"):
        old.unlink()

    filters = [f"fps={FPS}", f"scale=-2:{OUT_HEIGHT * 2}"]
    if flip:
        filters.append("hflip")

    run(
        [
            "ffmpeg", "-v", "error",
            "-ss", str(start), "-t", str(duration),
            "-i", str(clip),
            "-vf", ",".join(filters),
            "-vsync", "0",
            str(dest / "%04d.png"),
        ]
    )
    return sorted(dest.glob("*.png"))


def segment(frames: list[Path], session) -> list[np.ndarray]:
    """Per-frame person mask, as uint8 arrays."""
    from rembg import remove

    masks = []
    for i, frame in enumerate(frames, 1):
        with Image.open(frame) as im:
            mask = remove(im.convert("RGB"), session=session, only_mask=True)
        masks.append(np.array(mask.convert("L"), dtype=np.uint8))
        print(f"    frame {i}/{len(frames)}", end="\r", flush=True)
    print(" " * 30, end="\r")
    return masks


def smooth_over_time(masks: list[np.ndarray], window: int = 3) -> list[np.ndarray]:
    """
    Median-filter each pixel across neighbouring frames.

    Segmenting frames independently makes edges shimmer, which on a looping
    silhouette is far more distracting than it sounds. A short temporal median
    removes the shimmer without smearing genuine motion.
    """
    if len(masks) < window:
        return masks
    half = window // 2
    out = []
    for i in range(len(masks)):
        lo, hi = max(0, i - half), min(len(masks), i + half + 1)
        out.append(np.median(np.stack(masks[lo:hi]), axis=0).astype(np.uint8))
    return out


def union_bbox(masks: list[np.ndarray], pad: int = 24) -> tuple[int, int, int, int]:
    """
    One crop box covering the golfer across every frame.

    Cropping per frame would track the player and destroy the sense of motion —
    the whole point is to see the body move through the swing.
    """
    union = np.zeros_like(masks[0], dtype=bool)
    for m in masks:
        union |= m >= MASK_THRESHOLD
    if not union.any():
        h, w = masks[0].shape
        return 0, 0, w, h

    rows = np.where(union.any(axis=1))[0]
    cols = np.where(union.any(axis=0))[0]
    h, w = masks[0].shape
    return (
        max(0, int(cols[0]) - pad),
        max(0, int(rows[0]) - pad),
        min(w, int(cols[-1]) + pad),
        min(h, int(rows[-1]) + pad),
    )


def halftone(size: tuple[int, int], spacing: int, radius: float) -> Image.Image:
    """A tileable grid of soft dots, cycling through DOT_COLORS."""
    w, h = size
    tile = Image.new("RGB", size, BACKGROUND)
    px = tile.load()
    r2 = radius * radius
    for gy, cy in enumerate(range(spacing // 2, h, spacing)):
        for gx, cx in enumerate(range(spacing // 2, w, spacing)):
            color = DOT_COLORS[(gx + gy) % len(DOT_COLORS)]
            lo_y, hi_y = max(0, int(cy - radius)), min(h, int(cy + radius) + 1)
            lo_x, hi_x = max(0, int(cx - radius)), min(w, int(cx + radius) + 1)
            for y in range(lo_y, hi_y):
                for x in range(lo_x, hi_x):
                    if (x - cx) ** 2 + (y - cy) ** 2 <= r2:
                        px[x, y] = color
    return tile


def render(masks: list[np.ndarray], box: tuple[int, int, int, int], style: dict, dest: Path) -> None:
    """Composite each mask as a halftone-filled silhouette on black."""
    dest.mkdir(parents=True, exist_ok=True)
    for old in dest.glob("*.png"):
        old.unlink()

    pattern = halftone((OUT_WIDTH, OUT_HEIGHT), style["spacing"], style["radius"])
    background = Image.new("RGB", (OUT_WIDTH, OUT_HEIGHT), BACKGROUND)

    for i, mask in enumerate(masks, 1):
        m = Image.fromarray(mask).crop(box)
        # Fit into the output box without distorting the golfer.
        m.thumbnail((OUT_WIDTH, OUT_HEIGHT), Image.LANCZOS)
        canvas = Image.new("L", (OUT_WIDTH, OUT_HEIGHT), 0)
        canvas.paste(m, ((OUT_WIDTH - m.width) // 2, (OUT_HEIGHT - m.height) // 2))

        if style["mask_blur"]:
            canvas = canvas.filter(ImageFilter.GaussianBlur(style["mask_blur"]))
        canvas = canvas.point(lambda v: 255 if v >= MASK_THRESHOLD else 0)

        frame = Image.composite(pattern, background, canvas)
        frame.save(dest / f"{i:04d}.png")


def encode(frames: Path, out: Path, fps: int = FPS) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg", "-v", "error", "-y",
            "-framerate", str(fps),
            "-i", str(frames / "%04d.png"),
            "-c:v", "libx264", "-preset", "slow", "-crf", "26",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-an",
            str(out),
        ]
    )


def copy_reveal(clip: Path, out: Path, start: float, duration: float, flip: bool) -> None:
    """Stage 4: the source footage, trimmed and normalised to the same box."""
    out.parent.mkdir(parents=True, exist_ok=True)
    filters = [
        f"fps={FPS}",
        f"scale={OUT_WIDTH}:{OUT_HEIGHT}:force_original_aspect_ratio=decrease",
        f"pad={OUT_WIDTH}:{OUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black",
    ]
    if flip:
        filters.insert(0, "hflip")
    run(
        [
            "ffmpeg", "-v", "error", "-y",
            "-ss", str(start), "-t", str(duration),
            "-i", str(clip),
            "-vf", ",".join(filters),
            "-c:v", "libx264", "-preset", "slow", "-crf", "26",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
            str(out),
        ]
    )


def process(clip: Path, out_root: Path, opts: dict, work: Path, session) -> dict:
    player_id = clip.stem
    print(f"→ {player_id}")

    total = probe_duration(clip)
    start = float(opts.get("start", 0.0))
    duration = float(opts.get("duration", min(DEFAULT_DURATION, max(0.5, total - start))))
    flip = bool(opts.get("flip", False))

    raw = work / player_id / "raw"
    frames = extract_frames(clip, raw, start, duration, flip)
    if not frames:
        raise RuntimeError(f"no frames extracted from {clip.name}")
    print(f"  · {len(frames)} frames @ {FPS}fps ({duration:.1f}s from {start:.1f}s)")

    masks = smooth_over_time(segment(frames, session))
    coverage = float(np.mean([(m >= MASK_THRESHOLD).mean() for m in masks]))
    print(f"  · mask coverage {coverage:.1%}")
    if coverage < 0.01:
        print("    ! almost nothing segmented — is there a person in frame?", file=sys.stderr)

    box = union_bbox(masks)
    out_dir = out_root / player_id

    for stage, style in STAGE_STYLES.items():
        staged = work / player_id / f"stage{stage}"
        render(masks, box, style, staged)
        encode(staged, out_dir / f"{stage}.mp4")
        print(f"  · stage {stage} → {out_dir / f'{stage}.mp4'}")

    copy_reveal(clip, out_dir / "4.mp4", start, duration, flip)
    print(f"  · stage 4 → {out_dir / '4.mp4'}")

    # Poster from the coarsest stage, so nothing is given away before playback.
    first = sorted((work / player_id / "stage1").glob("*.png"))[0]
    with Image.open(first) as im:
        im.convert("RGB").save(out_dir / "poster.jpg", quality=82)

    return {
        str(s): f"/swings/{player_id}/{s}.mp4" for s in (*STAGE_STYLES, 4)
    } | {"poster": f"/swings/{player_id}/poster.jpg"}


def main() -> int:
    here = Path(__file__).parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clips", type=Path, default=here / "clips")
    parser.add_argument("--out", type=Path, default=here.parent / "public" / "swings")
    parser.add_argument("--manifest", type=Path, default=here / "swings.json")
    parser.add_argument("--work", type=Path, default=here / ".work")
    parser.add_argument("--only", help="process a single player id")
    parser.add_argument("--keep-work", action="store_true", help="keep intermediate frames")
    args = parser.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"{tool} not found — brew install ffmpeg")

    if not args.clips.is_dir():
        args.clips.mkdir(parents=True, exist_ok=True)
        sys.exit(
            f"No clips yet. Drop swing videos into {args.clips}/ named after the "
            "player id, e.g. tiger-woods.mp4"
        )

    clips = sorted(p for p in args.clips.iterdir() if p.suffix.lower() in VIDEO_SUFFIXES)
    if args.only:
        clips = [c for c in clips if c.stem == args.only]
    if not clips:
        sys.exit(f"No video files in {args.clips}")

    overrides_path = args.clips.parent / "clips.json"
    overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}

    from rembg import new_session

    print("Loading segmentation model (first run downloads ~170MB)…")
    session = new_session("u2net_human_seg")

    manifest = {}
    for clip in clips:
        try:
            manifest[clip.stem] = process(clip, args.out, overrides.get(clip.stem, {}), args.work, session)
        except Exception as exc:  # keep going; one bad clip shouldn't stop the batch
            print(f"  ! failed: {exc}", file=sys.stderr)

    if manifest:
        existing = json.loads(args.manifest.read_text()) if args.manifest.exists() else {}
        args.manifest.write_text(json.dumps(existing | manifest, indent=2) + "\n")
        print(f"\nDone — {len(manifest)} clip(s). Manifest: {args.manifest}")

    if not args.keep_work and args.work.exists():
        shutil.rmtree(args.work)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
