#!/usr/bin/env python3
"""
Batch-convert source photographs into the four reveal stages the game expects.

Run this offline, once, and commit the output. Nothing here runs per-request:
the game is a static site and expects finished assets on disk.

    python silhouette.py --sources sources/ --out ../public/silhouettes/

Each source file is named after the player id it belongs to, e.g.
`sources/rory-mcilroy.jpg` produces `public/silhouettes/rory-mcilroy/1.png`
through `4.png`.

READ pipeline/README.md BEFORE USING THIS on photographs of real people. Using
athlete photography raises licensing and right-of-publicity issues that this
script does nothing to solve.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter
except ImportError:  # pragma: no cover - dependency guidance
    sys.exit("Pillow is required: pip install -r requirements.txt")


# The game renders into a 400x462 box; matching it avoids layout shift.
TARGET_SIZE = (400, 462)

# Alpha below this is treated as background when flattening to a silhouette.
ALPHA_CUTOFF = 128


def cut_out(image: Image.Image) -> Image.Image:
    """
    Remove the background, returning RGBA with a transparent surround.

    Uses rembg (U^2-Net) when it is installed. Without it, falls back to
    treating the image as already-cut-out, which is only correct if you
    prepared the sources yourself.
    """
    try:
        from rembg import remove
    except ImportError:
        if image.mode != "RGBA":
            print(
                "  ! rembg not installed and source has no alpha channel — "
                "the silhouette will be a solid rectangle.",
                file=sys.stderr,
            )
            return image.convert("RGBA")
        return image

    return remove(image).convert("RGBA")


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Scale to fit inside `size` without distortion, centred on transparency."""
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    scaled = image.copy()
    scaled.thumbnail(size, Image.LANCZOS)
    canvas.paste(
        scaled,
        ((size[0] - scaled.width) // 2, (size[1] - scaled.height) // 2),
        scaled,
    )
    return canvas


def stage_1(cut: Image.Image) -> Image.Image:
    """Solid black cutout — every interior detail discarded."""
    out = Image.new("RGBA", cut.size, (0, 0, 0, 0))
    alpha = cut.getchannel("A").point(lambda a: 255 if a >= ALPHA_CUTOFF else 0)
    out.paste((17, 19, 24, 255), mask=alpha)
    return out


def stage_2(cut: Image.Image) -> Image.Image:
    """
    Silhouette with a hint of interior structure.

    Posterising to two levels inside the cutout suggests where the club and
    limbs are without revealing colour or kit.
    """
    body = cut.convert("RGB").convert("L").point(lambda v: 40 if v < 110 else 78)
    out = Image.merge("RGBA", (*body.convert("RGB").split(), cut.getchannel("A")))
    return out


def stage_3(cut: Image.Image) -> Image.Image:
    """Heavily desaturated and blurred — kit colours read, the face does not."""
    faded = cut.convert("RGB")
    grey = faded.convert("L").convert("RGB")
    faded = Image.blend(grey, faded, 0.45).filter(ImageFilter.GaussianBlur(4))
    return Image.merge("RGBA", (*faded.split(), cut.getchannel("A")))


def stage_4(cut: Image.Image) -> Image.Image:
    """The full reveal, unmodified."""
    return cut


STAGES = {1: stage_1, 2: stage_2, 3: stage_3, 4: stage_4}


def process(source: Path, out_root: Path, quality: int) -> dict[int, str]:
    print(f"→ {source.name}")
    player_id = source.stem
    out_dir = out_root / player_id
    out_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as raw:
        cut = fit(cut_out(raw.convert("RGBA")), TARGET_SIZE)

    written: dict[int, str] = {}
    for stage, fn in STAGES.items():
        path = out_dir / f"{stage}.png"
        fn(cut).save(path, "PNG", optimize=True, compress_level=quality)
        written[stage] = f"/silhouettes/{player_id}/{stage}.png"
        print(f"  · stage {stage} → {path}")
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=Path("sources"))
    parser.add_argument("--out", type=Path, default=Path("../public/silhouettes"))
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("images.json"),
        help="where to write the id → stage-URL map to paste into players.js",
    )
    parser.add_argument("--quality", type=int, default=9, help="PNG compression 0-9")
    args = parser.parse_args()

    if not args.sources.is_dir():
        sys.exit(f"No such directory: {args.sources}")

    images = sorted(
        p
        for p in args.sources.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    if not images:
        sys.exit(f"No source images found in {args.sources}")

    manifest = {src.stem: process(src, args.out, args.quality) for src in images}
    args.manifest.write_text(json.dumps(manifest, indent=2) + "\n")

    print(f"\nDone — {len(manifest)} player(s). Manifest: {args.manifest}")
    print("Add the matching `images` field to each player in src/data/players.js.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
