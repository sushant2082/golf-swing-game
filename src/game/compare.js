/**
 * Guess comparison for the attribute grid.
 *
 * Each guess is scored column by column against the answer, Wordle-style:
 * 'hit' (exact), 'near' (close enough to be a useful clue), 'miss', and
 * 'unknown' where the researchers could not verify a value. Numeric columns
 * carry a direction so even a miss narrows the search.
 *
 * A column only ever describes how the *guess* relates to the answer, never
 * the answer itself, so the grid cannot be read backwards.
 */

import { CONTINENTS } from '../data/continents.js'

/** Age is derived, never stored — a stored age is wrong within a year. */
export function ageOf(player, today = new Date()) {
  if (!player.born) return null
  const [y, m, d] = String(player.born).split('-').map(Number)
  if (!y) return null
  let age = today.getFullYear() - y
  // Only adjust for the birthday when we actually know month and day.
  if (m && d) {
    const hadBirthday =
      today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d)
    if (!hadBirthday) age -= 1
  }
  return age
}

/**
 * Column definitions. `near` is the tolerance for a "close" result; columns
 * without one are exact-match only.
 */
export const COLUMNS = [
  { key: 'tour', label: 'Tour' },
  { key: 'country', label: 'Country' },
  { key: 'age', label: 'Age', numeric: true, near: 5 },
  { key: 'heightCm', label: 'Height', numeric: true, near: 5 },
  { key: 'majors', label: 'Majors', numeric: true, near: 2 },
  { key: 'pgaTourWins', label: 'Wins', numeric: true, near: 5 },
]

function attributesFor(player) {
  return {
    tour: player.tour ?? null,
    country: player.country ?? null,
    age: ageOf(player),
    heightCm: player.heightCm ?? null,
    majors: player.majors ?? null,
    pgaTourWins: player.pgaTourWins ?? null,
  }
}

/**
 * Score one guess against the answer.
 * Returns a cell per column: { key, label, value, state, direction }.
 */
export function compareGuess(guess, answer) {
  const g = attributesFor(guess)
  const a = attributesFor(answer)

  return COLUMNS.map((column) => {
    const { key, label, numeric, near } = column
    const value = g[key]
    const target = a[key]

    // An unverified value on either side can't be compared honestly.
    if (value === null || target === null) {
      return { key, label, value, state: 'unknown', direction: null }
    }

    if (numeric) {
      if (value === target) return { key, label, value, state: 'hit', direction: null }
      return {
        key,
        label,
        value,
        state: Math.abs(value - target) <= near ? 'near' : 'miss',
        direction: value < target ? 'up' : 'down',
      }
    }

    if (key === 'country') {
      if (value === target) return { key, label, value, state: 'hit', direction: null }
      const sameContinent = CONTINENTS[value] && CONTINENTS[value] === CONTINENTS[target]
      return { key, label, value, state: sameContinent ? 'near' : 'miss', direction: null }
    }

    return { key, label, value, state: value === target ? 'hit' : 'miss', direction: null }
  })
}

/** Display text for a cell. */
export function formatValue(key, value) {
  if (value === null || value === undefined) return '?'
  if (key === 'heightCm') {
    const totalInches = Math.round(value / 2.54)
    return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`
  }
  return String(value)
}
