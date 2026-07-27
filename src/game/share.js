/**
 * Wordle-style share grid.
 *
 * Deliberately leaks nothing about the answer — only how many guesses were used
 * and whether each one was right, so a result posted publicly can't spoil the
 * puzzle for anyone who hasn't played.
 */

import { MAX_GUESSES } from './puzzle.js'

const WRONG = '⬛'
const RIGHT = '🟩'

export function buildShareText({ puzzleNumber, guesses, status }) {
  const score = status === 'won' ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`
  const grid = guesses
    .map((_, i) => (status === 'won' && i === guesses.length - 1 ? RIGHT : WRONG))
    .join('')

  return `🏌️ Swing IQ #${puzzleNumber} ${score}\n${grid}`
}

/**
 * Copy to the clipboard, falling back to a hidden textarea for browsers that
 * withhold the async API (older Safari, or any non-secure context).
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}
