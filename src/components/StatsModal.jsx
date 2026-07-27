import Modal from './Modal.jsx'
import { winPercentage } from '../game/stats.js'
import { MAX_GUESSES } from '../game/puzzle.js'

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-50">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  )
}

export default function StatsModal({ open, onClose, stats, highlightGuess }) {
  const peak = Math.max(1, ...stats.distribution)

  return (
    <Modal open={open} onClose={onClose} title="Statistics">
      <div className="grid grid-cols-4 gap-2">
        <Stat value={stats.played} label="Played" />
        <Stat value={`${winPercentage(stats)}%`} label="Win %" />
        <Stat value={stats.currentStreak} label="Current streak" />
        <Stat value={stats.maxStreak} label="Max streak" />
      </div>

      <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Guess distribution
      </h3>

      {stats.played === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500 dark:text-stone-400">
          Play your first round to start building stats.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {stats.distribution.map((count, i) => {
            const isCurrent = highlightGuess === i + 1
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-3 shrink-0 tabular-nums text-stone-500 dark:text-stone-400">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div
                    style={{ width: `${Math.max(8, (count / peak) * 100)}%` }}
                    className={`flex justify-end rounded px-2 py-0.5 text-xs font-semibold tabular-nums text-white transition-all ${
                      isCurrent ? 'bg-emerald-600' : 'bg-stone-400 dark:bg-stone-600'
                    }`}
                  >
                    {count}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-5 text-center text-xs text-stone-400 dark:text-stone-500">
        Stats are stored on this device only. Wins are counted out of {MAX_GUESSES} guesses.
      </p>
    </Modal>
  )
}
