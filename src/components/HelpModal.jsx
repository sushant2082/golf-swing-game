import Modal from './Modal.jsx'
import { MAX_GUESSES } from '../game/puzzle.js'
import { PLAYERS } from '../data/players.js'

const STAGES = [
  ['Guess 1', 'Silhouette only — build, stance, handedness and the shape of the swing.'],
  ['Guess 2', 'The club and shoes pick up colour.'],
  ['Guess 3', 'Shirt, trousers and headwear pick up colour.'],
  ['Guess 4–5', 'No further help. Back yourself.'],
]

export default function HelpModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="How to play">
      <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        Name the golfer from the silhouette of their swing. You get{' '}
        <strong>{MAX_GUESSES} guesses</strong>, and each wrong one reveals a little more.
      </p>

      <ol className="mt-4 flex flex-col gap-2.5">
        {STAGES.map(([label, text]) => (
          <li key={label} className="flex gap-3 text-sm">
            <span className="w-20 shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-500">
              {label}
            </span>
            <span className="text-stone-600 dark:text-stone-400">{text}</span>
          </li>
        ))}
      </ol>

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
