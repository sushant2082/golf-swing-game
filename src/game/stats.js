/**
 * Client-side persistence: per-day game state plus lifetime stats.
 *
 * Everything is namespaced and versioned so a future schema change can migrate
 * rather than silently corrupt. All reads are defensive — localStorage can be
 * unavailable (private browsing, blocked cookies) or hold hand-edited junk, and
 * the game must still load.
 */

import { MAX_GUESSES } from './puzzle.js'

const STATS_KEY = 'swingiq:stats:v1'
const GAME_KEY = 'swingiq:game:v1'

const EMPTY_STATS = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  /** Index 0 = won in 1 guess … index MAX_GUESSES-1 = won on the last guess. */
  distribution: Array(MAX_GUESSES).fill(0),
  lastPlayedNumber: null,
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
  }
}

/**
 * Fold a finished game into lifetime stats.
 * Recording the same puzzle number twice is a no-op, so a refresh after the
 * result modal opens can't inflate the streak.
 */
export function recordResult(stats, { puzzleNumber, won, guessCount }) {
  if (stats.lastPlayedNumber === puzzleNumber) return stats

  const consecutive = stats.lastPlayedNumber === puzzleNumber - 1
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
  }
  safeWrite(STATS_KEY, next)
  return next
}

/** Today's in-progress or finished game, or null if this puzzle is untouched. */
export function loadGame(puzzleNumber) {
  const stored = safeRead(GAME_KEY)
  if (!stored || stored.puzzleNumber !== puzzleNumber) return null
  if (!Array.isArray(stored.guesses)) return null
  return {
    puzzleNumber,
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
