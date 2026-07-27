/**
 * Dev-only pose sheet: renders the silhouette across every pose, build and
 * reveal stage so the kinematics can be eyeballed side by side.
 *
 * Served by Vite in dev at /poses.html. Not part of the production build —
 * `vite build` only picks up index.html.
 */
import { createRoot } from 'react-dom/client'
import '../index.css'
import GolferSilhouette from '../components/GolferSilhouette.jsx'
import { POSES } from '../game/skeleton.js'
import { PLAYERS } from '../data/players.js'

const mock = (over) => ({
  id: `mock-${JSON.stringify(over)}`,
  name: 'Mock',
  silhouette: {
    hand: 'R',
    pose: 'top',
    build: 0.5,
    height: 1,
    hat: 'cap',
    hair: 'short',
    colors: {
      shirt: '#c0392b',
      trousers: '#1f3a5f',
      hat: '#c0392b',
      shoes: '#f2f2f2',
      skin: '#e8bd9a',
      club: '#8a8f98',
    },
    ...over,
  },
})

const Cell = ({ label, children }) => (
  <figure className="m-0 flex flex-col items-center">
    <div className="w-full rounded-lg border border-stone-300 bg-stone-100 dark:border-stone-700 dark:bg-stone-900">{children}</div>
    <figcaption className="mt-1 text-center text-[11px] text-stone-600 dark:text-stone-400">{label}</figcaption>
  </figure>
)

function Sheet() {
  const poseKeys = Object.keys(POSES)

  return (
    <div className="mx-auto max-w-6xl bg-stone-50 p-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <h1 className="mb-1 text-2xl font-bold">Pose sheet</h1>
      <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">Dev only — not shipped in the build.</p>

      <h2 className="mb-2 text-lg font-semibold">Poses × reveal stage</h2>
      <div className="mb-8 grid grid-cols-4 gap-3">
        {poseKeys.map((pose) =>
          [1, 2, 3, 4].map((stage) => (
            <Cell key={`${pose}-${stage}`} label={`${pose} · stage ${stage}`}>
              <GolferSilhouette player={mock({ pose })} stage={stage} className="w-full" />
            </Cell>
          )),
        )}
      </div>

      <h2 className="mb-2 text-lg font-semibold">Build and handedness</h2>
      <div className="mb-8 grid grid-cols-6 gap-3">
        {[0, 0.25, 0.5, 0.75, 1].map((build) => (
          <Cell key={build} label={`build ${build}`}>
            <GolferSilhouette player={mock({ build, pose: 'top' })} stage={1} className="w-full" />
          </Cell>
        ))}
        <Cell label="left-handed">
          <GolferSilhouette player={mock({ hand: 'L', pose: 'top' })} stage={1} className="w-full" />
        </Cell>
      </div>

      <h2 className="mb-2 text-lg font-semibold">Headwear and hair</h2>
      <div className="mb-8 grid grid-cols-8 gap-3">
        {['cap', 'visor', 'bucket', 'flatcap', null].map((hat) => (
          <Cell key={String(hat)} label={hat ?? 'bare'}>
            <GolferSilhouette player={mock({ hat, pose: 'impact' })} stage={3} className="w-full" />
          </Cell>
        ))}
        {['short', 'long', 'ponytail', 'curly'].map((hair) => (
          <Cell key={hair} label={hair}>
            <GolferSilhouette
              player={mock({ hair, hat: null, pose: 'impact' })}
              stage={4}
              className="w-full"
            />
          </Cell>
        ))}
      </div>

      <h2 className="mb-2 text-lg font-semibold">Roster ({PLAYERS.length})</h2>
      <div className="grid grid-cols-8 gap-3">
        {PLAYERS.map((p) => (
          <Cell key={p.id} label={p.name}>
            <GolferSilhouette player={p} stage={1} className="w-full" />
          </Cell>
        ))}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Sheet />)
