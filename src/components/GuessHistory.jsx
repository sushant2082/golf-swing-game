import { MAX_GUESSES } from '../game/puzzle.js'
import { PLAYERS_BY_ID } from '../data/players.js'

/**
 * This round's guesses, padded out to the full attempt count so the layout
 * doesn't jump as rows fill in.
 */
export default function GuessHistory({ guesses, answerId, status }) {
  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => guesses[i] ?? null)

  return (
    <ol className="flex w-full flex-col gap-1.5" aria-label="Your guesses">
      {rows.map((id, i) => {
        if (!id) {
          return (
            <li
              key={i}
              className="h-11 rounded-lg border border-dashed border-stone-200 dark:border-stone-800"
              aria-hidden="true"
            />
          )
        }

        const player = PLAYERS_BY_ID[id]
        const correct = id === answerId
        return (
          <li
            key={i}
            className={`flex h-11 items-center justify-between gap-3 rounded-lg border px-3 text-sm ${
              correct
                ? 'border-emerald-600/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100'
                : 'border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400'
            }`}
          >
            <span className={`truncate font-medium ${correct ? '' : 'line-through decoration-stone-400'}`}>
              {player?.name ?? 'Unknown golfer'}
            </span>
            <span aria-hidden="true" className="shrink-0 text-base">
              {correct ? '🟩' : '⬛'}
            </span>
            <span className="sr-only">{correct ? 'Correct' : 'Incorrect'}</span>
          </li>
        )
      })}

      {status === 'playing' && (
        <p className="mt-1 text-center text-xs text-stone-500 dark:text-stone-400">
          {MAX_GUESSES - guesses.length} guess{MAX_GUESSES - guesses.length === 1 ? '' : 'es'} left
        </p>
      )}
    </ol>
  )
}
