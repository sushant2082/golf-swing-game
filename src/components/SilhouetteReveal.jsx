import GolferSilhouette from './GolferSilhouette.jsx'
import SwingPlayer from './SwingPlayer.jsx'
import { MAX_STAGE } from '../game/puzzle.js'

/**
 * Stage captions differ by medium: video keeps the silhouette all the way to
 * the reveal and simply sharpens it, while the procedural figure leaks colour
 * part by part.
 */
const STAGE_HINTS = {
  video: {
    1: 'Silhouette — coarse',
    2: 'Silhouette — sharper',
    3: 'Silhouette — full detail',
    4: 'Full reveal',
  },
  drawn: {
    1: 'Silhouette only',
    2: 'Club and shoes revealed',
    3: 'Clothing revealed',
    4: 'Full reveal',
  },
}

/**
 * The puzzle image plus its stage framing.
 *
 * The stage pips double as a progress indicator — players can see how much
 * more information is still to come, which is what makes spending a guess feel
 * like a trade rather than a loss.
 */
export default function SilhouetteReveal({ player, stage, revealed = false }) {
  const shown = revealed ? MAX_STAGE : stage

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100 shadow-sm dark:border-stone-800 dark:from-stone-900 dark:to-stone-950">
        {player.swing ? (
          <SwingPlayer
            swing={player.swing}
            stage={shown}
            revealed={revealed}
            playerName={player.name}
          />
        ) : player.images ? (
          /* Processed photography, if this player has any — see pipeline/. */
          <img
            src={player.images[shown]}
            alt={
              revealed
                ? `${player.name} mid-swing`
                : 'Silhouette of a golfer mid-swing. Guess who it is.'
            }
            width={400}
            height={462}
            decoding="async"
            fetchPriority="high"
            className="mx-auto block h-auto w-full max-w-sm"
          />
        ) : (
          <GolferSilhouette
            player={player}
            stage={shown}
            className="mx-auto block h-auto w-full max-w-sm transition-opacity duration-500"
          />
        )}

        {revealed && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-center">
            <p className="text-lg font-semibold text-white">{player.name}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <div className="flex gap-1.5" role="presentation">
          {Array.from({ length: MAX_STAGE }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i < shown ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            />
          ))}
        </div>
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
          {STAGE_HINTS[player.swing ? 'video' : 'drawn'][shown]}
        </p>
      </div>
    </div>
  )
}
