/**
 * The player database the game actually uses.
 *
 * Two pools, deliberately different sizes:
 *
 *   PLAYERS      every golfer in the researched roster — all guessable via the
 *                autocomplete, and all comparable in the guess grid.
 *   PUZZLE_POOL  the subset with a swing clip, which is what daily puzzles are
 *                drawn from.
 *
 * Splitting them is what lets the game launch: a player needs footage to be
 * the *answer*, but not to be a *guess*. Without the split, shipping would
 * mean sourcing clips for all 333.
 *
 * Attributes come from roster.js (generated — never hand-edit) and are merged
 * with the hand-authored overlay in content.js.
 */

import { ROSTER } from './roster.js'
import { SWINGS, FACTS, EXTRA_ALIASES } from './content.js'

/** Merge the generated roster with hand-authored content. */
export const PLAYERS = ROSTER.map((player) => {
  const aliases = [...new Set([...(player.aliases ?? []), ...(EXTRA_ALIASES[player.id] ?? [])])]
  const swing = SWINGS[player.id] ?? null

  return {
    ...player,
    aliases,
    fact: FACTS[player.id] ?? null,
    swing,
    /** Only players with footage can be the answer to a daily puzzle. */
    answerable: Boolean(swing),
  }
})

export const PLAYERS_BY_ID = Object.fromEntries(PLAYERS.map((p) => [p.id, p]))

/**
 * Candidates for the daily puzzle.
 *
 * Falls back to the full roster when no clips exist yet, so the game is still
 * playable during development rather than crashing on an empty pool. Once real
 * footage lands this narrows to exactly those players.
 */
export const PUZZLE_POOL = PLAYERS.filter((p) => p.answerable).length
  ? PLAYERS.filter((p) => p.answerable)
  : PLAYERS

/** True once at least one clip has been processed. */
export const HAS_FOOTAGE = PLAYERS.some((p) => p.answerable)
