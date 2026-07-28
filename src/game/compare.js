/**
 * Guess comparison for the attribute grid.
 *
 * Each guess is scored column by column against the answer, Wordle-style:
 * 'hit' (exact), 'near' (close enough to be a useful clue) and 'miss'.
 * Numeric columns also carry a direction so a miss still narrows the search.
 *
 * Nothing here reveals the answer directly — a column only ever says how the
 * *guess* relates to it.
 */

import { MAJORS, CONTINENTS } from '../data/attributes.js'

/** Strip the leading flag emoji from a players.js `country` string. */
export function countryName(country) {
  return country.replace(/^[^\p{L}]+/u, '').trim()
}

/** First year of the `years` range, e.g. "2007–present" → 2007. */
export function debutYear(player) {
  const match = player.years.match(/\d{4}/)
  return match ? Number(match[0]) : null
}

const decadeOf = (year) => (year === null ? null : Math.floor(year / 10) * 10)

/** The attribute set the grid compares. Column order is the display order. */
export const COLUMNS = [
  { key: 'tour', label: 'Tour' },
  { key: 'country', label: 'Country' },
  { key: 'debut', label: 'Debut' },
  { key: 'majors', label: 'Majors' },
  { key: 'hand', label: 'Hand' },
]

function attributesFor(player) {
  return {
    tour: player.tour,
    country: countryName(player.country),
    debut: decadeOf(debutYear(player)),
    majors: MAJORS[player.id] ?? null,
    hand: player.silhouette.hand,
  }
}

/**
 * Score one guess against the answer.
 * Returns a cell per column: { key, label, value, state, direction }.
 */
export function compareGuess(guess, answer) {
  const g = attributesFor(guess)
  const a = attributesFor(answer)

  return COLUMNS.map(({ key, label }) => {
    const value = g[key]
    let state = 'miss'
    let direction = null

    switch (key) {
      case 'tour':
      case 'hand':
        state = value === a[key] ? 'hit' : 'miss'
        break

      case 'country':
        if (value === a.country) state = 'hit'
        else if (CONTINENTS[value] && CONTINENTS[value] === CONTINENTS[a.country]) state = 'near'
        break

      case 'debut':
        if (value === null || a.debut === null) break
        if (value === a.debut) state = 'hit'
        else {
          if (Math.abs(value - a.debut) <= 10) state = 'near'
          direction = value < a.debut ? 'up' : 'down'
        }
        break

      case 'majors':
        if (value === null || a.majors === null) break
        if (value === a.majors) state = 'hit'
        else {
          if (Math.abs(value - a.majors) <= 2) state = 'near'
          direction = value < a.majors ? 'up' : 'down'
        }
        break

      default:
        break
    }

    return { key, label, value, state, direction }
  })
}

/** Display text for a cell, including the decade suffix. */
export function formatValue(key, value) {
  if (value === null || value === undefined) return '—'
  if (key === 'debut') return `${value}s`
  if (key === 'hand') return value === 'L' ? 'Left' : 'Right'
  return String(value)
}
