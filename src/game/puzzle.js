/**
 * Daily puzzle scheduling.
 *
 * Everyone gets the same golfer on the same calendar day, with no repeats until
 * the whole roster has been used. Rather than hashing the date straight into an
 * index (which repeats and clusters), we deterministically shuffle the roster
 * once per "cycle" of N days and walk through it — so a player can only recur
 * after every other player has appeared.
 */

import { PUZZLE_POOL } from '../data/players.js'

/** Day 0 of the game. Local time, not UTC — the puzzle rolls over at midnight. */
export const EPOCH = new Date(2026, 0, 1)

export const MAX_GUESSES = 5
export const MAX_STAGE = 4

/** mulberry32 — small, fast, well-distributed seeded PRNG. */
function seededRandom(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates using a seeded source, so the order is reproducible. */
function shuffled(list, seed) {
  const out = list.slice()
  const rand = seededRandom(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Local midnight for a date, so day maths ignores clock time. */
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Whole days between EPOCH and `date`, counted on the local calendar.
 *
 * The calendar fields are reprojected onto UTC before subtracting. Differencing
 * local midnights directly is off by an hour across a daylight-saving boundary,
 * which floors to the *previous* day and hands out the same puzzle twice — so
 * the no-repeat rotation silently breaks every spring.
 */
export function dayIndexFor(date = new Date()) {
  const asUTC = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((asUTC(startOfDay(date)) - asUTC(EPOCH)) / 86400000)
}

/** Stable `YYYY-MM-DD` key for localStorage, in local time. */
export function dateKey(date = new Date()) {
  const d = startOfDay(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * The order for a given cycle, avoiding a repeat across the seam.
 *
 * Cycles over PUZZLE_POOL — the players with swing footage — not the full
 * guessable roster. Every golfer is guessable; only those with a clip can be
 * the answer.
 */
function cycleOrder(cycle) {
  const order = shuffled(PUZZLE_POOL, cycle * 2654435761 + 12345)
  if (cycle > 0) {
    const previous = shuffled(PUZZLE_POOL, (cycle - 1) * 2654435761 + 12345)
    const lastId = previous[previous.length - 1].id
    if (order[0].id === lastId && order.length > 1) {
      ;[order[0], order[1]] = [order[1], order[0]]
    }
  }
  return order
}

/**
 * Today's puzzle (or any given date's).
 * Dates before EPOCH clamp to day 0 rather than producing negative indices.
 */
export function getPuzzle(date = new Date()) {
  const index = Math.max(0, dayIndexFor(date))
  const n = PUZZLE_POOL.length
  const order = cycleOrder(Math.floor(index / n))
  return {
    number: index + 1,
    dateKey: dateKey(date),
    player: order[index % n],
  }
}

/** Milliseconds until the next local midnight. */
export function msUntilNextPuzzle(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next - now
}

/**
 * Reveal stage for a number of guesses used. Stage 1 is the bare silhouette;
 * each wrong guess leaks a little more, capping out before the final guess so
 * the last attempt is never a giveaway.
 */
export function stageForGuesses(guessCount) {
  return Math.min(MAX_STAGE - 1, guessCount + 1)
}
