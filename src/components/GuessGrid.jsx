import { MAX_GUESSES } from '../game/puzzle.js'
import { PLAYERS_BY_ID } from '../data/players.js'
import { COLUMNS, compareGuess, formatValue } from '../game/compare.js'

const STATE_STYLES = {
  hit: 'bg-emerald-600 text-white border-emerald-600',
  near: 'bg-amber-400 text-stone-900 border-amber-400',
  miss: 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700',
}

const STATE_LABEL = { hit: 'exact match', near: 'close', miss: 'no match' }
const ARROW = { up: '↑', down: '↓' }

/**
 * Wordle-style attribute grid.
 *
 * A wrong guess still teaches the player something, which is what makes the
 * five-guess limit feel like deduction rather than luck. Numeric columns show
 * an arrow pointing toward the answer.
 */
export default function GuessGrid({ guesses, answerId, status }) {
  const answer = PLAYERS_BY_ID[answerId]
  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => guesses[i] ?? null)
  const remaining = MAX_GUESSES - guesses.length

  return (
    <div className="w-full">
      <div
        className="grid gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400"
        style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {COLUMNS.map((c) => (
          <div key={c.key} className="pb-1">
            {c.label}
          </div>
        ))}
      </div>

      <ol className="flex flex-col gap-1.5" aria-label="Your guesses">
        {rows.map((id, i) => {
          if (!id) {
            return (
              <li key={i} aria-hidden="true">
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0, 1fr))` }}
                >
                  {COLUMNS.map((c) => (
                    <div
                      key={c.key}
                      className="h-11 rounded-md border border-dashed border-stone-200 dark:border-stone-800"
                    />
                  ))}
                </div>
              </li>
            )
          }

          const player = PLAYERS_BY_ID[id]
          const cells = compareGuess(player, answer)
          const correct = id === answerId

          return (
            <li key={i}>
              <p
                className={`truncate pb-0.5 text-sm font-semibold ${
                  correct
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                {player?.name ?? 'Unknown golfer'}
                {correct && ' ✓'}
              </p>
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0, 1fr))` }}
              >
                {cells.map((cell) => (
                  <div
                    key={cell.key}
                    className={`flex h-11 flex-col items-center justify-center rounded-md border px-1 text-[11px] font-semibold leading-tight ${STATE_STYLES[cell.state]}`}
                  >
                    <span className="truncate">
                      {formatValue(cell.key, cell.value)}
                      {cell.direction && (
                        <span aria-hidden="true"> {ARROW[cell.direction]}</span>
                      )}
                    </span>
                    <span className="sr-only">
                      {cell.label}: {formatValue(cell.key, cell.value)}, {STATE_LABEL[cell.state]}
                      {cell.direction === 'up' && ', answer is higher'}
                      {cell.direction === 'down' && ', answer is lower'}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          )
        })}
      </ol>

      {status === 'playing' && (
        <p className="mt-2 text-center text-xs text-stone-500 dark:text-stone-400">
          {remaining} guess{remaining === 1 ? '' : 'es'} left
        </p>
      )}
    </div>
  )
}
