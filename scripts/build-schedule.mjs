#!/usr/bin/env node
/**
 * Build the daily puzzle schedule.
 *
 *     npm run schedule
 *
 * The order clips are uploaded IS the schedule: day 1 is the first clip, day 11
 * is the eleventh clip added, and appending never touches an earlier day.
 *
 * The only wrinkle is a missed day. If a date arrives with no clip queued for
 * it, the game shows a repeat — and that repeat is then written into `order`
 * permanently, so uploading a new clip afterwards cannot retroactively change a
 * day people already played.
 *
 * Everything this writes is append-only. `check-schedule.mjs` enforces that
 * against git, so the guarantee does not depend on this script being correct.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCHEDULE_PATH = join(ROOT, 'src/data/schedule.json')
const SWINGS_PATH = join(ROOT, 'pipeline/swings.json')

/** Local calendar day as YYYY-MM-DD. */
const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Whole days between two YYYY-MM-DD strings.
 *
 * Reprojected onto UTC before subtracting: differencing local midnights is off
 * by an hour across a daylight-saving boundary, which floors to the previous
 * day and would hand out the same puzzle twice.
 */
function daysBetween(fromKey, toKey) {
  const utc = (key) => {
    const [y, m, d] = key.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((utc(toKey) - utc(fromKey)) / 86400000)
}

function loadSchedule() {
  if (!existsSync(SCHEDULE_PATH)) return null
  return JSON.parse(readFileSync(SCHEDULE_PATH, 'utf8'))
}

function loadClipIds() {
  if (!existsSync(SWINGS_PATH)) {
    console.error(`No clip manifest at ${SWINGS_PATH} — run pipeline/swing_video.py first.`)
    process.exit(1)
  }
  const swings = JSON.parse(readFileSync(SWINGS_PATH, 'utf8'))
  // Insertion order is upload order; ids beginning with _ are pipeline scratch.
  return Object.keys(swings).filter((id) => !id.startsWith('_'))
}

/**
 * Pick a repeat for a day that has no new clip waiting.
 *
 * Least-recently-used, so the gap between sightings of any one golfer stays as
 * even as the pool allows. Deterministic, so every player sees the same repeat.
 */
function leastRecentlyUsed(order, candidates) {
  let best = candidates[0]
  let bestSeen = Infinity
  for (const id of candidates) {
    const seen = order.lastIndexOf(id)
    if (seen < bestSeen) {
      bestSeen = seen
      best = id
    }
  }
  return best
}

function main() {
  const today = dateKey(new Date())
  const clips = loadClipIds()

  if (clips.length === 0) {
    console.error('No processed clips found. Nothing to schedule.')
    process.exit(1)
  }

  const existing = loadSchedule()
  // --reset restarts numbering at today. Pre-launch only: it renumbers every
  // puzzle, which is why check-schedule.mjs refuses it without ALLOW_EPOCH_RESET.
  const reset = process.argv.includes('--reset')
  const epoch = reset ? today : (existing?.epoch ?? today)
  const order = existing?.order && !reset ? [...existing.order] : []
  const before = order.length

  // 1. Backfill any day that has already passed without an entry. Do this
  //    before appending new clips: those days are history and must be frozen
  //    as repeats, not filled with a clip uploaded afterwards.
  const daysElapsed = daysBetween(epoch, today) + 1
  let backfilled = 0
  while (order.length < daysElapsed && order.length > 0) {
    order.push(leastRecentlyUsed(order, clips))
    backfilled++
  }

  // 2. Append clips not yet scheduled, in upload order.
  const scheduled = new Set(order)
  const added = clips.filter((id) => !scheduled.has(id))
  order.push(...added)

  const next = { epoch, order }
  mkdirSync(dirname(SCHEDULE_PATH), { recursive: true })
  writeFileSync(SCHEDULE_PATH, `${JSON.stringify(next, null, 2)}\n`)

  const runway = order.length - daysElapsed
  console.log(`epoch          ${epoch}  (puzzle #1)`)
  console.log(`today          ${today}  (puzzle #${daysElapsed})`)
  console.log(`clips          ${clips.length}`)
  console.log(`scheduled      ${before} → ${order.length} days`)
  if (backfilled) console.log(`backfilled     ${backfilled} missed day(s) with repeats`)
  if (added.length) console.log(`newly queued   ${added.join(', ')}`)
  console.log(`runway         ${runway} day(s) beyond today`)

  if (runway < 0) {
    console.log('\nToday is past the end of the schedule — the game is showing repeats.')
  } else if (runway < 7) {
    console.log('\nFewer than 7 days queued. Upload more clips soon.')
  }
  console.log(`\nWrote ${SCHEDULE_PATH}`)
}

main()
