# Silhouette pipeline

Offline tooling that turns source photographs into the four reveal stages the
game renders. **The game does not need this to run** — it ships with procedural
SVG silhouettes and works fully without any of it.

## Read this before you use it

Using photographs of real athletes raises two separate problems, and this
script solves neither:

1. **Copyright in the photograph.** Sports photography is owned by the
   photographer or agency. Deriving a silhouette from a photo is a derivative
   work; it does not become yours because it has been flattened to black.
2. **Right of publicity.** Professional golfers control the commercial use of
   their name and likeness, independently of who owns the photo. A recognisable
   silhouette is still a likeness, and a game built around recognising them is
   the clearest possible case of trading on it.

Neither risk is theoretical at any real scale. Before running this over a
roster of real players, you want licensed source imagery *and* to have thought
about the likeness question — which is exactly why the shipped game uses
original illustrations instead.

Uses that are usually fine: photos you took yourself, properly licensed stock,
public-domain imagery, or your own players in a private/club setting.

## Install

```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

`rembg` pulls in ONNX Runtime and downloads a ~170 MB U²-Net model on first
run. If you skip it, the script assumes your sources already have transparent
backgrounds.

## Use

Name each source file after the player `id` in `src/data/players.js`:

```
pipeline/sources/
  rory-mcilroy.jpg
  nelly-korda.jpg
```

Then:

```bash
python silhouette.py --sources sources/ --out ../public/silhouettes/
```

This writes `public/silhouettes/<id>/1.png` … `4.png` and an `images.json`
manifest.

## Wiring the output in

Add an `images` field to the player in `src/data/players.js`, copying the entry
from `images.json`:

```js
{
  id: 'rory-mcilroy',
  name: 'Rory McIlroy',
  // …
  images: {
    1: '/silhouettes/rory-mcilroy/1.png',
    2: '/silhouettes/rory-mcilroy/2.png',
    3: '/silhouettes/rory-mcilroy/3.png',
    4: '/silhouettes/rory-mcilroy/4.png',
  },
}
```

`SilhouetteReveal` prefers `images` when present and falls back to the
procedural SVG otherwise, so you can convert the roster a few players at a time
and the game keeps working throughout.

## Reveal stages

Photographs can't be segmented into "club" and "shirt" automatically the way
the SVG figure can, so the stages degrade information globally instead:

| Stage | Treatment |
| ----- | --------- |
| 1 | Solid black cutout, all interior detail discarded |
| 2 | Two-level posterised interior — limbs and club become legible |
| 3 | Desaturated and blurred — kit colours read, the face does not |
| 4 | Full reveal, unmodified |

Keep the source pose consistent across the roster (top of the backswing is the
usual choice) or the puzzle becomes a test of which photo you happened to find
rather than of recognising a swing.

## Fairness note

Stage 1 discards interior pixels rather than darkening them, so the answer
cannot be recovered by turning up the brightness on the delivered PNG. Stages 2
and 3 genuinely resample the image for the same reason. Don't replace them with
a CSS filter over the full-resolution photo — that ships the answer to the
browser on the first guess.
