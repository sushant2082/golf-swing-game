/**
 * Client-side persistence: per-day game state plus lifetime stats.
 *
 * Everything is namespaced and versioned so a schema change can migrate rather
 * than silently corrupt. All reads are defensive — localStorage can be
 * unavailable (private browsing, blocked cookies) or hold hand-edited junk, and
 * the game must still load.
 */

import { MAX_GUESSES, dateKey, daysBetween } from './puzzle.js'

// v2: puzzle numbering restarted at #1 for launch, so v1 records carry numbers
// from a different era and must not be read.
const STATS_KEY = 'swingiq:stats:v2'
const GAME_KEY = 'swingiq:game:v2'

const EMPTY_STATS = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  /** Index 0 = won in 1 guess … index MAX_GUESSES-1 = won on the last guess. */
  distribution: Array(MAX_GUESSES).fill(0),
  lastPlayedNumber: null,
  lastPlayedDate: null,
}

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadStats() {
  const stored = safeRead(STATS_KEY)
  if (!stored || typeof stored !== 'object') return { ...EMPTY_STATS }

  const distribution = Array(MAX_GUESSES).fill(0)
  if (Array.isArray(stored.distribution)) {
    stored.distribution.slice(0, MAX_GUESSES).forEach((n, i) => {
      distribution[i] = Number.isFinite(n) ? n : 0
    })
  }

  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0)
  return {
    played: num(stored.played),
    wins: num(stored.wins),
    currentStreak: num(stored.currentStreak),
    maxStreak: num(stored.maxStreak),
    distribution,
    lastPlayedNumber: Number.isFinite(stored.lastPlayedNumber) ? stored.lastPlayedNumber : null,
    lastPlayedDate: typeof stored.lastPlayedDate === 'string' ? stored.lastPlayedDate : null,
  }
}

/**
 * Fold a finished game into lifetime stats.
 *
 * Streak continuity is decided by date, not by puzzle number. Numbers are only
 * contiguous with days while the epoch never moves, so comparing them breaks
 * across any renumbering — dates do not.
 */
export function recordResult(stats, { puzzleNumber, dateKey: playedOn, won, guessCount }) {
  if (stats.lastPlayedNumber === puzzleNumber) return stats

  const consecutive =
    stats.lastPlayedDate != null && daysBetween(stats.lastPlayedDate, playedOn) === 1

  const distribution = stats.distribution.slice()
  if (won && guessCount >= 1 && guessCount <= MAX_GUESSES) {
    distribution[guessCount - 1] += 1
  }

  const currentStreak = won ? (consecutive ? stats.currentStreak : 0) + 1 : 0

  const next = {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    lastPlayedNumber: puzzleNumber,
    lastPlayedDate: playedOn,
  }
  safeWrite(STATS_KEY, next)
  return next
}

/**
 * Today's in-progress or finished game, or null if this puzzle is untouched.
 *
 * Matches on the answer and the date as well as the number. If a saved game
 * ever disagreed about who the answer was, restoring it would replay guesses
 * made against a different golfer — better to start clean than to show a
 * corrupt board.
 */
export function loadGame(puzzleNumber, todayKey, answerId) {
  const stored = safeRead(GAME_KEY)
  if (!stored || !Array.isArray(stored.guesses)) return null
  if (stored.puzzleNumber !== puzzleNumber) return null
  if (stored.dateKey !== todayKey) return null
  if (stored.answerId !== answerId) return null

  return {
    puzzleNumber,
    dateKey: todayKey,
    answerId,
    guesses: stored.guesses.filter((g) => typeof g === 'string'),
    status: ['playing', 'won', 'lost'].includes(stored.status) ? stored.status : 'playing',
  }
}

export function saveGame(game) {
  safeWrite(GAME_KEY, game)
}

/** Only meaningful once at least one game is complete. */
export function winPercentage(stats) {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100)
}

export { dateKey }
