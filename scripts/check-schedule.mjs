#!/usr/bin/env node
/**
 * Validate the puzzle schedule. Runs on `prebuild`, so a broken schedule
 * cannot produce a deployable build.
 *
 * The important check is immutability: the committed schedule must be a prefix
 * of the working one. That is what guarantees a day someone has already played
 * can never change its answer, and it is checked against git rather than
 * trusted from the generator.
 */

import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCHEDULE_PATH = join(ROOT, 'src/data/schedule.json')
const SWINGS_PATH = join(ROOT, 'pipeline/swings.json')

const errors = []
const warnings = []

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function daysBetween(fromKey, toKey) {
  const utc = (key) => {
    const [y, m, d] = key.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((utc(toKey) - utc(fromKey)) / 86400000)
}

/** The committed schedule, or null if this is the first commit of it. */
function committedSchedule() {
  try {
    const raw = execFileSync('git', ['show', 'HEAD:src/data/schedule.json'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function main() {
  if (!existsSync(SCHEDULE_PATH)) {
    console.error('No src/data/schedule.json — run `npm run schedule`.')
    process.exit(1)
  }

  const schedule = JSON.parse(readFileSync(SCHEDULE_PATH, 'utf8'))
  const { epoch, order } = schedule

  if (!/^\d{4}-\d{2}-\d{2}$/.test(epoch ?? '')) errors.push(`invalid epoch: ${epoch}`)
  if (!Array.isArray(order) || order.length === 0) errors.push('order is empty')

  // --- immutability, checked against git rather than trusted --------------
  const previous = committedSchedule()
  if (previous) {
    if (previous.epoch !== epoch) {
      errors.push(`epoch changed: ${previous.epoch} → ${epoch}. Every puzzle number would shift.`)
    }
    for (let i = 0; i < (previous.order?.length ?? 0); i++) {
      if (order[i] !== previous.order[i]) {
        errors.push(
          `day ${i + 1} changed: ${previous.order[i]} → ${order[i] ?? '(missing)'}. ` +
            'The schedule must be append-only — that day may already have been played.',
        )
        break
      }
    }
    if (order.length < (previous.order?.length ?? 0)) {
      errors.push('schedule got shorter — days were removed')
    }
  } else {
    warnings.push('no committed schedule to compare against (first run)')
  }

  // --- every scheduled id must actually be playable ------------------------
  const swings = existsSync(SWINGS_PATH) ? JSON.parse(readFileSync(SWINGS_PATH, 'utf8')) : {}
  const rosterIds = new Set(
    readFileSync(join(ROOT, 'src/data/roster.js'), 'utf8')
      .matchAll(/^\s*id: "([^"]+)"/gm)
      .map((m) => m[1]),
  )

  for (const id of new Set(order)) {
    if (!rosterIds.has(id)) {
      errors.push(`scheduled id not in roster: ${id}`)
      continue
    }
    const entry = swings[id]
    if (!entry) {
      errors.push(`scheduled id has no clip manifest: ${id}`)
      continue
    }
    for (const stage of ['1', '2', '3', '4', 'poster']) {
      if (!entry[stage]) {
        errors.push(`${id}: manifest missing stage ${stage}`)
        continue
      }
      // Manifest-says-yes / file-says-no is what ships a blank video player.
      const file = join(ROOT, 'public', entry[stage].replace(/^\//, ''))
      if (!existsSync(file)) errors.push(`${id}: manifest points at missing file ${entry[stage]}`)
    }
  }

  // --- runway --------------------------------------------------------------
  const today = dateKey(new Date())
  const todayNumber = daysBetween(epoch, today) + 1
  const runway = order.length - todayNumber
  if (runway < 0) {
    warnings.push(`today is ${-runway} day(s) past the end of the schedule — showing repeats`)
  } else if (runway < 7) {
    warnings.push(`only ${runway} day(s) queued beyond today`)
  }

  for (const w of warnings) console.log(`warn   ${w}`)
  for (const e of errors) console.error(`ERROR  ${e}`)

  if (errors.length) {
    console.error(`\n${errors.length} problem(s). Build blocked.`)
    process.exit(1)
  }
  console.log(
    `schedule ok — ${order.length} days from ${epoch}, today is #${todayNumber}, ${Math.max(0, runway)} queued ahead`,
  )
}

main()
