# Swing IQ 

A daily browser guessing game: you're shown the **silhouette of a golfer's
swing** and have five attempts to name them. One puzzle a day, the same for
everyone, with a Wordle-style shareable result grid.

Modelled on [Batter Up!](https://www.batter-up.app/), for golf.

## How it works

- **One puzzle per day**, derived deterministically from the date — no backend
  needed, and every player sees the same golfer.
- **Five guesses.** Each wrong guess advances the reveal a stage: bare
  silhouette → equipment colour → clothing colour → full reveal.
- **Autocomplete** over the roster, tolerant of nicknames, accents and the
  misspellings people actually type ("Speith", "Mickleson", "Rahmbo").
- **Stats and streaks** persist in `localStorage`. No account, no login.
- **Share grid** gives away nothing but your guess count, so posting a result
  can't spoil the puzzle.

## Silhouette art

The game ships with **procedurally drawn SVG silhouettes** — a small
forward-kinematic skeleton posed at the top of the backswing, impact, the
takeaway or the finish, varied per golfer by build, height, handedness, stance
and headwear. This sidesteps the right-of-publicity and licensing risk that
comes with using real photographs of athletes.

A Python pipeline for converting real photographs into silhouettes is
scaffolded in [`pipeline/`](pipeline/) for anyone who has properly licensed
source imagery. See [`pipeline/README.md`](pipeline/README.md) — including the
licensing warning, which is worth reading before you use it.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production bundle into dist/
npm run preview    # serve the built bundle locally
```

The build output in `dist/` is fully static — deploy it to Vercel, Netlify,
Cloudflare Pages, or S3 + CloudFront without any server-side component.

## Project layout

```
src/
  data/
    roster.js                  GENERATED — researched players, do not hand-edit
    content.js                 hand-authored overlay: facts, aliases, clip manifest
    players.js                 merges the two; PLAYERS (guessable) + PUZZLE_POOL
    schedule.json              GENERATED — the daily answer for each day
  game/
    puzzle.js                  date → golfer lookup against the schedule
    compare.js                 attribute grid scoring (hit / near / miss / unknown)
    search.js                  name normalisation and autocomplete ranking
    stats.js                   localStorage game state and lifetime stats
    share.js                   emoji result grid, native share and clipboard
  components/
    SwingPlayer.jsx            looping silhouette video
    SilhouetteReveal.jsx       stage framing and captions
    GuessInput.jsx             ARIA combobox autocomplete
    GuessGrid.jsx              Wordle-style attribute comparison grid
    ResultModal.jsx            reveal footage, stats, share
    GolferSilhouette.jsx       drawn fallback for players without footage
pipeline/                      offline clip → silhouette tooling
scripts/                       schedule generator and validator
```

## Adding a swing

The order clips are uploaded **is** the schedule. Day 1 is the first clip, day
11 is the eleventh you add. Appending never changes a day that has already been
played.

```bash
cp my-clip.mov pipeline/clips/scottie-scheffler.mp4   # name it after the player id
cd pipeline && .venv/bin/python swing_video.py        # process to silhouette stages
cd .. && npm run schedule                             # queue it on the next open day
git add -A && git commit && git push                  # Cloudflare deploys on push
```

`npm run schedule` is append-only and `npm run check:schedule` enforces that
against git — it runs automatically on `prebuild`, so a build cannot ship a
schedule that would change an already-played day.

If you miss a day, the game shows a repeat and the next generator run records
that repeat permanently, so a clip added afterwards cannot retroactively replace
it.

Clips work best face-on, 2–4 seconds, one swing, camera locked off, whole body
in frame. Backgrounds with galleries or heavy foliage make segmentation harder —
see `pipeline/README.md`.

## Deploying

Cloudflare Pages, building `npm run build` into `dist/` on Node 22. Caching is
set in `public/_headers`: clip assets are immutable, `index.html` is never
cached so a new schedule takes effect immediately.
