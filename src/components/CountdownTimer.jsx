import { useEffect, useState } from 'react'
import { msUntilNextPuzzle } from '../game/puzzle.js'

const pad = (n) => String(n).padStart(2, '0')

function format(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`
}

/**
 * Time until the next puzzle.
 *
 * Fires `onExpire` at the rollover so an open tab left overnight picks up the
 * new day instead of sitting on a stale, already-finished puzzle.
 */
export default function CountdownTimer({ onExpire }) {
  const [remaining, setRemaining] = useState(() => msUntilNextPuzzle())

  useEffect(() => {
    const id = setInterval(() => {
      const next = msUntilNextPuzzle()
      setRemaining(next)
      if (next <= 1000) onExpire?.()
    }, 1000)
    return () => clearInterval(id)
  }, [onExpire])

  return (
    <div className="text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Next swing in
      </p>
      <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
        {format(remaining)}
      </p>
    </div>
  )
}
