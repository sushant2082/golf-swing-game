/**
 * Name matching for the guess input.
 *
 * Players' names carry diacritics (Sörenstam, García, Åberg, Boutier) that
 * nobody is going to type, so everything is normalised to plain lowercase ASCII
 * before comparison, and each player's alias list absorbs nicknames and the
 * misspellings people actually make.
 */

import { PLAYERS } from '../data/players.js'

export function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining accents
    .replace(/[^a-zA-Z0-9 ]/g, ' ') // punctuation and hyphens become spaces
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Every string that should resolve to a given player. */
function termsFor(player) {
  return [player.name, ...(player.aliases ?? [])].map(normalize)
}

const SEARCH_INDEX = PLAYERS.map((player) => ({
  player,
  terms: termsFor(player),
  surname: normalize(player.name).split(' ').slice(-1)[0],
}))

/**
 * Autocomplete suggestions, ranked so the most likely intent comes first:
 * surname prefix > any-term prefix > substring anywhere.
 */
export function searchPlayers(query, limit = 8) {
  const q = normalize(query)
  if (!q) return []

  const scored = []
  for (const entry of SEARCH_INDEX) {
    let best = Infinity
    for (const term of entry.terms) {
      if (term === q) best = Math.min(best, 0)
      else if (entry.surname.startsWith(q)) best = Math.min(best, 1)
      else if (term.startsWith(q)) best = Math.min(best, 2)
      else if (term.split(' ').some((w) => w.startsWith(q))) best = Math.min(best, 3)
      else if (term.includes(q)) best = Math.min(best, 4)
    }
    if (best < Infinity) scored.push({ player: entry.player, rank: best })
  }

  scored.sort((a, b) => a.rank - b.rank || a.player.name.localeCompare(b.player.name))
  return scored.slice(0, limit).map((s) => s.player)
}

/** Resolve typed text to exactly one player, or null if it's not a clean match. */
export function resolvePlayer(query) {
  const q = normalize(query)
  if (!q) return null

  const exact = SEARCH_INDEX.find((e) => e.terms.includes(q))
  if (exact) return exact.player

  // A unique surname match is unambiguous enough to accept.
  const bySurname = SEARCH_INDEX.filter((e) => e.surname === q)
  return bySurname.length === 1 ? bySurname[0].player : null
}
