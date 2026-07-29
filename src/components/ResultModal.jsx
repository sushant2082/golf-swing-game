import { useState } from 'react'
import Modal from './Modal.jsx'
import GolferSilhouette from './GolferSilhouette.jsx'
import CountdownTimer from './CountdownTimer.jsx'
import { buildShareText, copyToClipboard } from '../game/share.js'
import { MAX_GUESSES } from '../game/puzzle.js'
import { ageOf, formatValue } from '../game/compare.js'

const WIN_HEADLINES = [
  'Flushed it.',
  'Right in the middle.',
  'Striped.',
  'Dead centre.',
  'Nailed it.',
]

export default function ResultModal({
  open,
  onClose,
  player,
  status,
  guesses,
  puzzleNumber,
  onShowStats,
  onExpire,
}) {
  const [copied, setCopied] = useState(false)
  const won = status === 'won'
  const age = ageOf(player)

  const share = async () => {
    const text = buildShareText({ puzzleNumber, guesses, status })
    const ok = await copyToClipboard(text)
    setCopied(ok)
    if (ok) window.setTimeout(() => setCopied(false), 2200)
  }

  const title = won
    ? WIN_HEADLINES[Math.min(guesses.length - 1, WIN_HEADLINES.length - 1)]
    : 'Out of bounds.'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="-mt-2 mb-4 text-sm text-stone-500 dark:text-stone-400">
        {won
          ? `Got it in ${guesses.length} of ${MAX_GUESSES}.`
          : `Today's golfer was ${player.name}.`}
      </p>

      <div className="mb-4 overflow-hidden rounded-xl border border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100 dark:border-stone-800 dark:from-stone-900 dark:to-stone-950">
        <GolferSilhouette
          player={player}
          stage={4}
          className="mx-auto block h-auto w-full max-w-[240px]"
        />
      </div>

      <div className="mb-4 rounded-xl bg-stone-50 p-4 dark:bg-stone-800/60">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">{player.name}</h3>
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
          {[player.country, player.tour, age ? `age ${age}` : null].filter(Boolean).join(' · ')}
        </p>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['Majors', player.majors],
            ['PGA wins', player.pgaTourWins],
            ['Height', player.heightCm ? formatValue('heightCm', player.heightCm) : null],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white/60 py-2 dark:bg-stone-900/60">
              <dt className="text-[10px] uppercase tracking-wide text-stone-400">{label}</dt>
              <dd className="text-base font-bold tabular-nums text-stone-900 dark:text-stone-100">
                {value ?? '—'}
              </dd>
            </div>
          ))}
        </dl>

        {player.fact && (
          <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            {player.fact}
          </p>
        )}
      </div>

      <div className="mb-5 border-y border-stone-200 py-4 dark:border-stone-800">
        <CountdownTimer onExpire={onExpire} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onShowStats}
          className="flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Stats
        </button>
        <button
          type="button"
          onClick={share}
          className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900"
        >
          {copied ? 'Copied ✓' : 'Share'}
        </button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {copied ? 'Result copied to clipboard' : ''}
      </p>
    </Modal>
  )
}
