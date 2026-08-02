import { useEffect, useRef, useState } from 'react'

/**
 * Looping swing clip.
 *
 * Tempo and transition are the most recognisable things about a golfer, so the
 * clip loops continuously rather than playing once — the motion *is* the
 * puzzle. Swapping stages changes the `src`, so the element is keyed by stage
 * to force a clean reload instead of a stale first frame.
 */
export default function SwingPlayer({ swing, stage, revealed, playerName, className }) {
  const videoRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const src = swing?.[String(stage)]

  // Autoplay is refused often enough (low power mode, data saver, reduced
  // motion) that it needs an explicit fallback rather than a silent black box.
  //
  // The play() promise can also reject simply because the source changed
  // mid-load, which is not a real refusal — so the overlay is only shown if the
  // element is still paused once the browser has had a chance to start.
  useEffect(() => {
    setFailed(false)
    const el = videoRef.current
    if (!el) return

    let cancelled = false
    const attempt = el.play()
    if (attempt?.catch) {
      attempt.catch(() => {
        if (!cancelled && el.paused) setFailed(true)
      })
    }
    return () => {
      cancelled = true
    }
  }, [src])

  if (!src) return null

  return (
    <div className="relative">
      <video
        key={src}
        ref={videoRef}
        src={src}
        poster={swing.poster}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onPlaying={() => setFailed(false)}
        aria-label={
          revealed
            ? `Video of ${playerName} swinging`
            : 'Looping silhouette of a golfer swinging. Guess who it is.'
        }
        className={className ?? 'mx-auto block h-auto w-full max-w-sm bg-black'}
      />

      {failed && (
        <button
          type="button"
          onClick={() => {
            videoRef.current?.play()
            setFailed(false)
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white"
        >
          ▶ Tap to play
        </button>
      )}
    </div>
  )
}
