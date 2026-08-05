import { useCallback, useEffect, useRef, useState } from 'react'
import SilhouetteReveal from './components/SilhouetteReveal.jsx'
import GuessInput from './components/GuessInput.jsx'
import GuessGrid from './components/GuessGrid.jsx'
import ResultModal from './components/ResultModal.jsx'
import StatsModal from './components/StatsModal.jsx'
import HelpModal from './components/HelpModal.jsx'
import { getPuzzle, stageForGuesses, MAX_GUESSES } from './game/puzzle.js'
import { loadGame, saveGame, loadStats, recordResult } from './game/stats.js'

const HELP_SEEN_KEY = 'swingiq:seen-help:v1'

export default function App() {
  const [puzzle, setPuzzle] = useState(() => getPuzzle())
  const [guesses, setGuesses] = useState([])
  const [status, setStatus] = useState('playing')
  const [stats, setStats] = useState(loadStats)
  const [showResult, setShowResult] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  // Guards the restore effect against re-running on a React remount.
  const restoredFor = useRef(null)

  // Load any saved progress for this puzzle, and show the rules on a first visit.
  useEffect(() => {
    if (restoredFor.current === puzzle.number) return
    restoredFor.current = puzzle.number

    const saved = loadGame(puzzle.number, puzzle.dateKey, puzzle.player.id)
    if (saved) {
      setGuesses(saved.guesses)
      setStatus(saved.status)
      if (saved.status !== 'playing') setShowResult(true)
      return
    }

    setGuesses([])
    setStatus('playing')
    setShowResult(false)

    try {
      if (!localStorage.getItem(HELP_SEEN_KEY)) {
        setShowHelp(true)
        localStorage.setItem(HELP_SEEN_KEY, '1')
      }
    } catch {
      // localStorage unavailable — skip the intro rather than break the game.
    }
  }, [puzzle.number, puzzle.dateKey, puzzle.player.id])

  const handleGuess = useCallback(
    (player) => {
      if (status !== 'playing') return

      const nextGuesses = [...guesses, player.id]
      const won = player.id === puzzle.player.id
      const nextStatus = won ? 'won' : nextGuesses.length >= MAX_GUESSES ? 'lost' : 'playing'

      setGuesses(nextGuesses)
      setStatus(nextStatus)
      saveGame({
        puzzleNumber: puzzle.number,
        dateKey: puzzle.dateKey,
        answerId: puzzle.player.id,
        guesses: nextGuesses,
        status: nextStatus,
      })

      setAnnouncement(
        won
          ? `Correct. Today's golfer was ${player.name}.`
          : nextStatus === 'lost'
            ? `Incorrect. Out of guesses — the answer was ${puzzle.player.name}.`
            : `Incorrect. ${MAX_GUESSES - nextGuesses.length} guesses left.`,
      )

      if (nextStatus !== 'playing') {
        setStats((prev) =>
          recordResult(prev, {
            puzzleNumber: puzzle.number,
            dateKey: puzzle.dateKey,
            won,
            guessCount: nextGuesses.length,
          }),
        )
        // Let the final reveal land before the modal covers it.
        window.setTimeout(() => setShowResult(true), 900)
      }
    },
    [guesses, status, puzzle],
  )

  /** Roll over to the new puzzle when the countdown crosses midnight. */
  const handleDayRollover = useCallback(() => {
    const next = getPuzzle()
    if (next.number !== puzzle.number) {
      setShowResult(false)
      setPuzzle(next)
    }
  }, [puzzle.number])

  const finished = status !== 'playing'
  const stage = stageForGuesses(guesses.length)

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            aria-label="How to play"
            className="rounded-lg px-3 py-2 text-lg leading-none font-bold text-stone-500 transition hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            ?
          </button>

          <div className="text-center">
            <h1 className="text-lg font-extrabold uppercase tracking-[0.18em]">
              Swing<span className="text-emerald-600"> IQ</span>
            </h1>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              #{puzzle.number} · Guess the golfer
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowStats(true)}
            aria-label="Statistics"
            className="rounded-lg px-3 py-2 text-lg leading-none transition hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:hover:bg-stone-800"
          >
            📊
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-5">
        <SilhouetteReveal player={puzzle.player} stage={stage} revealed={finished} />

        <GuessGrid guesses={guesses} answerId={puzzle.player.id} status={status} />

        {finished ? (
          <button
            type="button"
            onClick={() => setShowResult(true)}
            className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950"
          >
            See today&apos;s result
          </button>
        ) : (
          <GuessInput onGuess={handleGuess} disabled={finished} alreadyGuessed={guesses} />
        )}
      </main>

      <footer className="px-4 pb-6 text-center text-[11px] text-stone-400 dark:text-stone-600">
        A new swing every day at midnight.
      </footer>

      {/* Screen-reader narration for guess outcomes, which are otherwise purely visual. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ResultModal
        open={showResult}
        onClose={() => setShowResult(false)}
        player={puzzle.player}
        status={status}
        guesses={guesses}
        puzzleNumber={puzzle.number}
        onExpire={handleDayRollover}
        onShowStats={() => {
          setShowResult(false)
          setShowStats(true)
        }}
      />

      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        highlightGuess={status === 'won' ? guesses.length : null}
      />

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
