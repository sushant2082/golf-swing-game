import Modal from './Modal.jsx'
import { MAX_GUESSES } from '../game/puzzle.js'
import { PLAYERS } from '../data/players.js'
import { COLUMNS } from '../game/compare.js'

const KEY = [
  ['hit', 'Exact match'],
  ['near', 'Close — same continent, within a decade, or within two majors'],
  ['miss', 'No match'],
]

const SWATCH = {
  hit: 'bg-emerald-600',
  near: 'bg-amber-400',
  miss: 'bg-stone-200 dark:bg-stone-700',
}

export default function HelpModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="How to play">
      <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        Name the golfer from the silhouette of their swing. You get{' '}
        <strong>{MAX_GUESSES} guesses</strong>, and the silhouette sharpens with each one.
      </p>

      <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Every guess is a clue
      </h3>
      <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        A wrong guess still tells you something. Each one is scored against the answer across{' '}
        {COLUMNS.map((c) => c.label.toLowerCase()).join(', ')}:
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {KEY.map(([state, text]) => (
          <li key={state} className="flex items-center gap-3 text-sm">
            <span className={`h-5 w-8 shrink-0 rounded ${SWATCH[state]}`} aria-hidden="true" />
            <span className="text-stone-600 dark:text-stone-400">{text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        Debut and majors also show an arrow — <strong>↑</strong> means the answer is higher than
        your guess, <strong>↓</strong> means lower.
      </p>

      <div className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-600 dark:bg-stone-800/60 dark:text-stone-400">
        <p>
          The roster covers <strong>{PLAYERS.length} golfers</strong> across the PGA Tour, the LPGA
          and the legends of the game. Nicknames work — try &ldquo;Lefty&rdquo; or &ldquo;The
          Shark&rdquo;.
        </p>
        <p className="mt-2">
          Everyone gets the same golfer each day, and a new one arrives at midnight.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900"
      >
        Play
      </button>
    </Modal>
  )
}
