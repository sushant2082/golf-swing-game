/**
 * Dev-only gallery of every processed swing clip.
 *
 * Served by Vite at /swings.html. Shows each player's four reveal stages side
 * by side so segmentation quality, club recovery and stage progression can be
 * judged at a glance. Not part of the production build.
 */
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { PLAYERS } from '../data/players.js'

const STAGE_LABEL = {
  1: 'Stage 1 — coarse',
  2: 'Stage 2 — sharper',
  3: 'Stage 3 — full detail',
  4: 'Stage 4 — reveal',
}

function Clip({ src, poster, label }) {
  return (
    <figure className="m-0">
      <video
        src={src}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        className="block w-full rounded-lg bg-black"
      />
      <figcaption className="mt-1 text-center text-[11px] text-stone-500 dark:text-stone-400">
        {label}
      </figcaption>
    </figure>
  )
}

function Gallery() {
  const withFootage = PLAYERS.filter((p) => p.swing)
  const [only, setOnly] = useState(null)
  const shown = only ? withFootage.filter((p) => p.id === only) : withFootage

  return (
    <div className="mx-auto max-w-6xl bg-stone-50 p-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <h1 className="text-2xl font-bold">Processed swings</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {withFootage.length} of {PLAYERS.length} players have footage. These are the players a
        daily puzzle can currently be drawn from. Dev only — not shipped.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOnly(null)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            only === null
              ? 'bg-emerald-700 text-white'
              : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
          }`}
        >
          All
        </button>
        {withFootage.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOnly(p.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              only === p.id
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {shown.map((p) => (
        <section key={p.id} className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">
            {p.name}{' '}
            <span className="text-sm font-normal text-stone-500 dark:text-stone-400">
              {p.country} · {p.tour} · {p.majors} majors
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((stage) => (
              <Clip
                key={stage}
                src={p.swing[stage]}
                poster={p.swing.poster}
                label={STAGE_LABEL[stage]}
              />
            ))}
          </div>
        </section>
      ))}

      {withFootage.length === 0 && (
        <p className="mt-10 text-center text-sm text-stone-500">
          No processed clips yet. Drop videos into pipeline/clips/ and run swing_video.py.
        </p>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Gallery />)
