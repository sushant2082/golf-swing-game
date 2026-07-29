/**
 * Procedural golfer swing silhouette.
 *
 * Renders the skeleton from `game/skeleton.js` as thick round-capped strokes so
 * the whole figure reads as one solid shape. Every part is tagged with a name
 * so the reveal stages can recolour groups independently without re-laying out.
 */

import { buildSkeleton, hashString, VIEW_W, VIEW_H, VIEW_TOP, GROUND_Y } from '../game/skeleton.js'

// --- reveal stages ----------------------------------------------------------

/**
 * Which parts are coloured at each stage. Stage 1 is a pure black cutout;
 * later stages leak information in a deliberate order (equipment → clothing →
 * everything), so the puzzle gets easier without ever jumping straight to the
 * answer.
 */
const STAGE_PARTS = {
  1: [],
  2: ['club', 'shoes'],
  3: ['club', 'shoes', 'shirt', 'trousers', 'hat'],
  4: ['club', 'shoes', 'shirt', 'trousers', 'hat', 'skin', 'hair'],
}

/**
 * Unrevealed parts inherit the SVG's text colour rather than a fixed black, so
 * the cutout stays high-contrast in both themes: dark figure on a light panel
 * in light mode, light figure on a dark panel in dark mode. A hardcoded black
 * silhouette disappears entirely against a dark background.
 */
const SILHOUETTE_INK = 'currentColor'

// --- component --------------------------------------------------------------

const POSE_KEYS = ['takeaway', 'top', 'impact', 'finish']
const HATS = ['cap', 'visor', 'flatcap', null]
const HAIR = ['short', 'short', 'long', 'curly']

/**
 * Placeholder appearance for a player with no authored silhouette.
 *
 * The researched roster carries no art parameters, so these are derived from
 * the player's id and height — deterministic, so a given golfer always looks
 * the same, and varied enough that the roster doesn't render as 333 identical
 * figures. This is scaffolding: real swing footage replaces it per player.
 */
function deriveSilhouette(player) {
  const h = hashString(player.id)
  const pick = (list, salt) => list[Math.floor(hashString(player.id + salt) * list.length) % list.length]

  // 175cm sits mid-range for tour players; map roughly 163-198cm onto the scale.
  const heightScale = player.heightCm ? 0.88 + (player.heightCm - 163) / 175 : 1

  return {
    hand: 'R',
    pose: pick(POSE_KEYS, 'pose'),
    build: hashString(player.id + 'build'),
    height: Math.max(0.86, Math.min(1.1, heightScale)),
    hat: pick(HATS, 'hat'),
    hair: pick(HAIR, 'hair'),
    colors: {
      shirt: `hsl(${Math.floor(h * 360)} 55% 45%)`,
      trousers: '#2b2f38',
      hat: `hsl(${Math.floor(h * 360)} 55% 45%)`,
      shoes: '#f2f2f2',
      skin: '#c98f63',
      club: '#8a8f98',
    },
  }
}

export default function GolferSilhouette({
  player,
  stage = 1,
  className = '',
  showGround = true,
}) {
  const spec = player.silhouette ?? deriveSilhouette(player)
  const s = buildSkeleton(spec, player.id)
  const lit = new Set(STAGE_PARTS[Math.min(4, Math.max(1, stage))] ?? [])
  const colors = spec.colors ?? {}

  /** Fill/stroke colour for a named part at the current stage. */
  const paint = (part) => (lit.has(part) ? colors[part] ?? SILHOUETTE_INK : SILHOUETTE_INK)

  /**
   * Bare skin only appears at the full reveal. Until then forearms take the
   * shirt colour so they read as sleeves — leaving them black against a
   * coloured torso looks like a rendering fault rather than a hidden detail.
   */
  const skinOrSleeve = () => (lit.has('skin') ? paint('skin') : paint('shirt'))

  const b = s.build
  const limb = (base) => base * s.scale * (0.85 + b * 0.4)
  const armW = limb(17)
  const legW = limb(24)
  const shaftW = Math.max(2.6, 3.4 * s.scale)

  const mirrored = spec.hand === 'L'

  // Feet: a shoe wedge from the ankle, rolled up onto the toe when the pose
  // calls for it (the trail foot through impact and the finish).
  const foot = (ankle, heelLift, dir) => {
    const toe = 30 * s.scale * dir
    const heel = -14 * s.scale * dir
    const lift = heelLift * 20 * s.scale
    const sole = GROUND_Y + 4
    return `M ${ankle.x + heel} ${sole - lift}
            L ${ankle.x + heel} ${sole - lift - 13 * s.scale}
            Q ${ankle.x} ${sole - lift - 16 * s.scale} ${ankle.x + toe * 0.55} ${sole - 9 * s.scale}
            L ${ankle.x + toe} ${sole - 3 * s.scale}
            Q ${ankle.x + toe * 1.08} ${sole} ${ankle.x + toe * 0.9} ${sole}
            L ${ankle.x + heel} ${sole - lift} Z`
  }

  // Torso tapers to a waist rather than running straight from shoulder to hip —
  // a flat trapezoid reads as a cardboard box at silhouette scale.
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  const centreAt = (t) => lerp(s.neck, s.pelvis, t)
  const waistPull = (p, t, amount) => {
    const mid = centreAt(t)
    return { x: p.x + (mid.x - p.x) * amount, y: p.y + (mid.y - p.y) * amount }
  }
  const leadWaist = waistPull(lerp(s.leadShoulder, s.leadHip, 0.6), 0.6, 0.3)
  const trailWaist = waistPull(lerp(s.trailShoulder, s.trailHip, 0.6), 0.6, 0.3)

  const torsoPath = `M ${s.trailShoulder.x} ${s.trailShoulder.y}
     L ${s.leadShoulder.x} ${s.leadShoulder.y}
     Q ${leadWaist.x} ${leadWaist.y} ${s.leadHip.x} ${s.leadHip.y}
     L ${s.trailHip.x} ${s.trailHip.y}
     Q ${trailWaist.x} ${trailWaist.y} ${s.trailShoulder.x} ${s.trailShoulder.y} Z`

  const headRx = s.dims.headR * 0.87
  const headRy = s.dims.headR

  return (
    <svg
      viewBox={`0 ${VIEW_TOP} ${VIEW_W} ${VIEW_H - VIEW_TOP}`}
      className={`text-stone-900 dark:text-stone-100 ${className}`}
      role="img"
      aria-label={`Silhouette of a golfer at ${s.pose.label}`}
    >
      {showGround && (
        <g aria-hidden="true">
          <ellipse
            cx={VIEW_W / 2}
            cy={GROUND_Y + 8}
            rx={135}
            ry={13}
            className="fill-black/10 dark:fill-white/10"
          />
          <line
            x1={40}
            y1={GROUND_Y + 6}
            x2={VIEW_W - 40}
            y2={GROUND_Y + 6}
            className="stroke-black/15 dark:stroke-white/15"
            strokeWidth={2}
          />
          {/* The ball sits where the club actually is at impact, and just
              forward of centre in the poses where it hasn't been struck yet. */}
          <circle
            cx={
              spec.pose === 'impact'
                ? mirrored
                  ? VIEW_W - s.clubHead.x
                  : s.clubHead.x
                : VIEW_W / 2 + (mirrored ? -16 : 16)
            }
            cy={GROUND_Y}
            r={5.5}
            className="fill-black/30 dark:fill-white/35"
          />
        </g>
      )}

      <g transform={mirrored ? `translate(${VIEW_W} 0) scale(-1 1)` : undefined}>
        {/* Club first so the body overlaps the grip end. */}
        <g>
          <line
            x1={s.clubButt.x}
            y1={s.clubButt.y}
            x2={s.clubHead.x}
            y2={s.clubHead.y}
            stroke={paint('club')}
            strokeWidth={shaftW}
            strokeLinecap="round"
          />
          <circle cx={s.clubHead.x} cy={s.clubHead.y} r={9 * s.scale} fill={paint('club')} />
        </g>

        {/* Trail-side limbs behind the torso, lead-side limbs in front. */}
        <g stroke={paint('shirt')} strokeWidth={armW} strokeLinecap="round" fill="none">
          <path d={`M ${s.trailShoulder.x} ${s.trailShoulder.y} L ${s.trailElbow.x} ${s.trailElbow.y}`} />
        </g>
        <g stroke={skinOrSleeve()} strokeWidth={armW * 0.86} strokeLinecap="round" fill="none">
          <path d={`M ${s.trailElbow.x} ${s.trailElbow.y} L ${s.hands.x} ${s.hands.y}`} />
        </g>

        {/* Legs */}
        <g stroke={paint('trousers')} strokeWidth={legW} strokeLinecap="round" fill="none">
          <path d={`M ${s.trailHip.x} ${s.trailHip.y} L ${s.trailKnee.x} ${s.trailKnee.y} L ${s.trailAnkle.x} ${s.trailAnkle.y}`} strokeLinejoin="round" />
          <path d={`M ${s.leadHip.x} ${s.leadHip.y} L ${s.leadKnee.x} ${s.leadKnee.y} L ${s.leadAnkle.x} ${s.leadAnkle.y}`} strokeLinejoin="round" />
        </g>
        <g fill={paint('shoes')}>
          <path d={foot(s.trailAnkle, s.trailHeel, -1)} />
          <path d={foot(s.leadAnkle, 0, 1)} />
        </g>

        {/* Torso, with rounded joints so the shoulders and hips don't read as
            the square corners of a slab. */}
        <g fill={paint('trousers')}>
          <circle cx={s.leadHip.x} cy={s.leadHip.y} r={legW * 0.5} />
          <circle cx={s.trailHip.x} cy={s.trailHip.y} r={legW * 0.5} />
        </g>
        <path
          d={torsoPath}
          fill={paint('shirt')}
          stroke={paint('shirt')}
          strokeWidth={legW * 0.42}
          strokeLinejoin="round"
        />

        <g fill={paint('shirt')}>
          <circle cx={s.leadShoulder.x} cy={s.leadShoulder.y} r={armW * 0.62} />
          <circle cx={s.trailShoulder.x} cy={s.trailShoulder.y} r={armW * 0.62} />
        </g>

        {/* Neck + head */}
        <line
          x1={s.neck.x}
          y1={s.neck.y}
          x2={s.headCenter.x}
          y2={s.headCenter.y}
          stroke={skinOrSleeve()}
          strokeWidth={17 * s.scale}
          strokeLinecap="round"
        />
        <g transform={`rotate(${s.headAngle} ${s.headCenter.x} ${s.headCenter.y})`}>
          <ellipse cx={s.headCenter.x} cy={s.headCenter.y} rx={headRx} ry={headRy} fill={paint('skin')} />
          <Hair kind={spec.hair} cx={s.headCenter.x} cy={s.headCenter.y} rx={headRx} ry={headRy} fill={paint('hair')} />
          {spec.hat && (
            <Hat kind={spec.hat} cx={s.headCenter.x} cy={s.headCenter.y} rx={headRx} ry={headRy} fill={paint('hat')} mirrored={mirrored} />
          )}
          {stage >= 4 && <Face cx={s.headCenter.x} cy={s.headCenter.y} rx={headRx} ry={headRy} />}
        </g>

        {/* Lead arm on top */}
        <g stroke={paint('shirt')} strokeWidth={armW} strokeLinecap="round" fill="none">
          <path d={`M ${s.leadShoulder.x} ${s.leadShoulder.y} L ${s.leadElbow.x} ${s.leadElbow.y}`} />
        </g>
        <g stroke={skinOrSleeve()} strokeWidth={armW * 0.86} strokeLinecap="round" fill="none">
          <path d={`M ${s.leadElbow.x} ${s.leadElbow.y} L ${s.hands.x} ${s.hands.y}`} />
        </g>

        {/* Hands / glove */}
        <circle cx={s.hands.x} cy={s.hands.y} r={armW * 0.62} fill={skinOrSleeve()} />
      </g>
    </svg>
  )
}

// --- head furniture ---------------------------------------------------------

function Hair({ kind, cx, cy, rx, ry, fill }) {
  switch (kind) {
    case 'long':
      return (
        <path
          d={`M ${cx - rx} ${cy - ry * 0.2} Q ${cx - rx * 1.25} ${cy + ry * 1.5} ${cx - rx * 0.35} ${cy + ry * 1.7}
              Q ${cx} ${cy + ry * 1.85} ${cx + rx * 0.5} ${cy + ry * 1.4}
              L ${cx + rx * 0.8} ${cy - ry * 0.3} Z`}
          fill={fill}
        />
      )
    case 'ponytail':
      return (
        <>
          <path
            d={`M ${cx - rx} ${cy - ry * 0.35} Q ${cx} ${cy - ry * 1.35} ${cx + rx} ${cy - ry * 0.35}
                Q ${cx} ${cy - ry * 0.55} ${cx - rx} ${cy - ry * 0.35} Z`}
            fill={fill}
          />
          <path
            d={`M ${cx - rx * 0.75} ${cy + ry * 0.1} Q ${cx - rx * 1.7} ${cy + ry * 1.1} ${cx - rx * 1.1} ${cy + ry * 1.9}
                Q ${cx - rx * 0.55} ${cy + ry * 1.25} ${cx - rx * 0.25} ${cy + ry * 0.5} Z`}
            fill={fill}
          />
        </>
      )
    case 'curly':
      return (
        <g fill={fill}>
          <circle cx={cx - rx * 0.6} cy={cy - ry * 0.65} r={rx * 0.42} />
          <circle cx={cx} cy={cy - ry * 0.9} r={rx * 0.46} />
          <circle cx={cx + rx * 0.6} cy={cy - ry * 0.6} r={rx * 0.42} />
          <circle cx={cx - rx * 0.95} cy={cy - ry * 0.1} r={rx * 0.34} />
          <circle cx={cx + rx * 0.95} cy={cy - ry * 0.1} r={rx * 0.34} />
        </g>
      )
    default:
      return (
        <path
          d={`M ${cx - rx} ${cy - ry * 0.25} Q ${cx} ${cy - ry * 1.3} ${cx + rx} ${cy - ry * 0.25}
              Q ${cx} ${cy - ry * 0.5} ${cx - rx} ${cy - ry * 0.25} Z`}
          fill={fill}
        />
      )
  }
}

function Hat({ kind, cx, cy, rx, ry, fill, mirrored }) {
  // Peaks point away from the target, i.e. screen-left in the un-mirrored frame.
  const peak = mirrored ? 1 : -1
  const crown = `M ${cx - rx * 1.05} ${cy - ry * 0.3} Q ${cx} ${cy - ry * 1.55} ${cx + rx * 1.05} ${cy - ry * 0.3} Z`

  switch (kind) {
    case 'visor':
      return (
        <g fill={fill}>
          <path
            d={`M ${cx - rx * 1.05} ${cy - ry * 0.32} Q ${cx} ${cy - ry * 0.9} ${cx + rx * 1.05} ${cy - ry * 0.32}
                L ${cx + rx * 1.05} ${cy - ry * 0.12} Q ${cx} ${cy - ry * 0.62} ${cx - rx * 1.05} ${cy - ry * 0.12} Z`}
          />
          <path
            d={`M ${cx} ${cy - ry * 0.55} L ${cx + peak * rx * 1.9} ${cy - ry * 0.75} L ${cx + peak * rx * 1.85} ${cy - ry * 0.35} L ${cx} ${cy - ry * 0.2} Z`}
          />
        </g>
      )
    case 'bucket':
      return (
        <g fill={fill}>
          <path d={`M ${cx - rx * 0.95} ${cy - ry * 0.35} Q ${cx} ${cy - ry * 1.7} ${cx + rx * 0.95} ${cy - ry * 0.35} Z`} />
          <ellipse cx={cx} cy={cy - ry * 0.34} rx={rx * 1.85} ry={ry * 0.24} />
        </g>
      )
    case 'flatcap':
      return (
        <g fill={fill}>
          <path d={`M ${cx - rx * 1.1} ${cy - ry * 0.35} Q ${cx + peak * rx * 0.3} ${cy - ry * 1.5} ${cx + rx * 1.05} ${cy - ry * 0.45} Z`} />
          <path
            d={`M ${cx} ${cy - ry * 0.4} L ${cx + peak * rx * 1.75} ${cy - ry * 0.62} L ${cx + peak * rx * 1.7} ${cy - ry * 0.3} L ${cx} ${cy - ry * 0.15} Z`}
          />
        </g>
      )
    default: // 'cap'
      return (
        <g fill={fill}>
          <path d={crown} />
          <path
            d={`M ${cx} ${cy - ry * 0.42} L ${cx + peak * rx * 1.85} ${cy - ry * 0.6} L ${cx + peak * rx * 1.8} ${cy - ry * 0.22} L ${cx} ${cy - ry * 0.1} Z`}
          />
        </g>
      )
  }
}

/** Minimal face, only ever shown on the full reveal. */
function Face({ cx, cy, rx, ry }) {
  return (
    <g fill="#2b2118" opacity={0.75}>
      <circle cx={cx - rx * 0.34} cy={cy + ry * 0.08} r={rx * 0.11} />
      <circle cx={cx + rx * 0.34} cy={cy + ry * 0.08} r={rx * 0.11} />
      <rect x={cx - rx * 0.28} y={cy + ry * 0.48} width={rx * 0.56} height={ry * 0.07} rx={ry * 0.035} />
    </g>
  )
}
