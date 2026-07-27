# Swing IQ 🏌️

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
  data/players.js              roster: names, aliases, facts, silhouette params
  game/
    puzzle.js                  date → golfer scheduling, no-repeat cycling
    search.js                  name normalisation and autocomplete ranking
    stats.js                   localStorage game state and lifetime stats
    share.js                   emoji result grid and clipboard handling
  components/
    GolferSilhouette.jsx       the procedural SVG figure and pose library
    SilhouetteReveal.jsx       stage framing, captions and transitions
    GuessInput.jsx             ARIA combobox autocomplete
    GuessHistory.jsx           this round's guesses
    ResultModal.jsx            win/loss reveal, fun fact, share button
    StatsModal.jsx             streaks, win rate, guess distribution
    CountdownTimer.jsx         time until the next puzzle
pipeline/                      offline photo → silhouette tooling (optional)
```

## Adding golfers

Append to `PLAYERS` in `src/data/players.js`. The `id` is used for puzzle
scheduling and stored game state, so treat it as permanent once shipped.
Adding players changes the puzzle rotation — fine before launch, disruptive
after, since it reshuffles which golfer lands on which future date.
