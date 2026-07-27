/**
 * Procedural golfer swing silhouette.
 *
 * A small forward-kinematic skeleton (pelvis → spine → shoulders → arms → club,
 * pelvis → legs → feet) rendered as thick round-capped strokes so the whole
 * figure reads as one solid shape. Every part is tagged with a `part` name so
 * the reveal stages can recolour groups independently without re-laying out.
 *
 * All poses are authored for a RIGHT-handed golfer viewed face-on, with the
 * target to the viewer's right. Left-handers are mirrored with a transform.
 */

const VIEW_W = 400
const VIEW_H = 520
const GROUND_Y = 482

// --- geometry helpers -------------------------------------------------------

const rad = (deg) => (deg * Math.PI) / 180

/** Point `len` from `p` at `deg`, where 0° is straight up and +° is clockwise. */
const pt = (p, len, deg) => ({
  x: p.x + len * Math.sin(rad(deg)),
  y: p.y - len * Math.cos(rad(deg)),
})

/**
 * Two-link inverse kinematics: place an elbow so the hand lands on `target`.
 * `sign` picks which of the two mirror solutions to use (elbow in/out).
 */
function ik(shoulder, target, l1, l2, sign) {
  const dx = target.x - shoulder.x
  const dy = target.y - shoulder.y
  const reach = Math.min(Math.hypot(dx, dy), (l1 + l2) * 0.999) || 0.001
  const base = Math.atan2(dy, dx)
  const cosB = (reach * reach + l1 * l1 - l2 * l2) / (2 * reach * l1)
  const bend = Math.acos(Math.max(-1, Math.min(1, cosB)))
  const theta = base + sign * bend
  return { x: shoulder.x + l1 * Math.cos(theta), y: shoulder.y + l1 * Math.sin(theta) }
}

/** Cheap stable hash so each player gets repeatable micro-variation. */
function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

// --- pose library -----------------------------------------------------------

export const POSES = {
  takeaway: {
    label: 'takeaway',
    spine: -10,
    hipScale: 0.9,
    hipTilt: -2,
    shoulderScale: 0.78,
    shoulderTilt: 14,
    headTilt: 4,
    leadArm: 201,
    leadElbow: 4,
    trailElbowSign: 1,
    club: 260,
    leadThigh: 172,
    leadShin: 178,
    trailThigh: 189,
    trailShin: 176,
    trailHeel: 0,
  },
  top: {
    label: 'top of the backswing',
    spine: -15,
    hipScale: 0.76,
    hipTilt: -4,
    shoulderScale: 0.5,
    shoulderTilt: 27,
    headTilt: 10,
    leadArm: -57,
    leadElbow: 8,
    trailElbowSign: 1,
    club: 106,
    leadThigh: 173,
    leadShin: 179,
    trailThigh: 190,
    trailShin: 175,
    trailHeel: 0,
  },
  impact: {
    label: 'impact',
    spine: -17,
    hipScale: 0.84,
    hipTilt: -7,
    shoulderScale: 0.8,
    shoulderTilt: 9,
    headTilt: 7,
    leadArm: 172,
    leadElbow: 2,
    trailElbowSign: -1,
    club: 188,
    leadThigh: 170,
    leadShin: 177,
    trailThigh: 193,
    trailShin: 167,
    trailHeel: 0.55,
  },
  finish: {
    label: 'the finish',
    spine: 20,
    hipScale: 0.6,
    hipTilt: 9,
    shoulderScale: 0.52,
    shoulderTilt: -22,
    headTilt: -16,
    leadArm: -34,
    leadElbow: -88,
    trailElbowSign: -1,
    club: -118,
    leadThigh: 172,
    leadShin: 177,
    trailThigh: 199,
    trailShin: 152,
    trailHeel: 1,
  },
}

// --- skeleton ---------------------------------------------------------------

/** Base limb lengths, before the per-player height scale. */
const DIM = {
  pelvisY: 300,
  hipWidth: 46,
  torso: 118,
  shoulderWidth: 98,
  neck: 15,
  headR: 25,
  upperArm: 66,
  foreArm: 60,
  thigh: 88,
  shin: 84,
  club: 152,
}

/**
 * Resolve a player's silhouette params into concrete joint positions.
 * Returns everything in the un-mirrored (right-handed) frame.
 */
export function buildSkeleton(spec, id = '') {
  const pose = POSES[spec.pose] ?? POSES.top
  const jitter = hashString(id || spec.pose) - 0.5 // -0.5 .. 0.5

  const scale = spec.height ?? 1
  const build = spec.build ?? 0.5

  // Per-player tweaks so two players sharing a pose don't render identically.
  const spineAngle = pose.spine + jitter * 7
  const armAngle = pose.leadArm + jitter * 6
  const clubAngle = pose.club + jitter * 9
  const stanceSpread = jitter * 5

  const d = {
    hipWidth: DIM.hipWidth * scale * (0.9 + build * 0.3),
    torso: DIM.torso * scale,
    shoulderWidth: DIM.shoulderWidth * scale * (0.88 + build * 0.3),
    neck: DIM.neck * scale,
    headR: DIM.headR * scale * (0.95 + build * 0.08),
    upperArm: DIM.upperArm * scale,
    foreArm: DIM.foreArm * scale,
    thigh: DIM.thigh * scale,
    shin: DIM.shin * scale,
    club: DIM.club * scale,
  }

  // Anchor the figure so the feet sit on the ground regardless of height.
  const pelvis = { x: VIEW_W / 2, y: GROUND_Y - (d.thigh + d.shin) * 0.94 }

  // Hips (foreshortened by rotation, tilted).
  const hipHalf = (d.hipWidth / 2) * pose.hipScale
  const leadHip = pt(pelvis, hipHalf, 90 + pose.hipTilt)
  const trailHip = pt(pelvis, hipHalf, 270 + pose.hipTilt)

  // Spine → neck → shoulders → head.
  const neck = pt(pelvis, d.torso, spineAngle)
  const shoulderHalf = (d.shoulderWidth / 2) * pose.shoulderScale
  const leadShoulder = pt(neck, shoulderHalf, spineAngle + 90 + pose.shoulderTilt)
  const trailShoulder = pt(neck, shoulderHalf, spineAngle + 270 + pose.shoulderTilt)
  const headAngle = spineAngle + pose.headTilt
  const headCenter = pt(neck, d.neck + d.headR * 0.82, headAngle)

  // Lead arm drives the hands; the trail arm is solved back to the same grip.
  const leadElbow = pt(leadShoulder, d.upperArm, armAngle)
  const hands = pt(leadElbow, d.foreArm, armAngle + pose.leadElbow)
  const trailElbow = ik(trailShoulder, hands, d.upperArm, d.foreArm, pose.trailElbowSign)

  // Club runs from the grip; the butt sticks out a little behind the hands.
  const clubHead = pt(hands, d.club, clubAngle)
  const clubButt = pt(hands, -d.club * 0.11, clubAngle)

  // Legs.
  const leadKnee = pt(leadHip, d.thigh, pose.leadThigh - stanceSpread)
  const leadAnkle = pt(leadKnee, d.shin, pose.leadShin - stanceSpread)
  const trailKnee = pt(trailHip, d.thigh, pose.trailThigh + stanceSpread)
  const trailAnkle = pt(trailKnee, d.shin, pose.trailShin + stanceSpread)

  return {
    pose,
    dims: d,
    build,
    scale,
    pelvis,
    leadHip,
    trailHip,
    neck,
    leadShoulder,
    trailShoulder,
    headCenter,
    headAngle,
    leadElbow,
    trailElbow,
    hands,
    clubHead,
    clubButt,
    leadKnee,
    leadAnkle,
    trailKnee,
    trailAnkle,
    trailHeel: pose.trailHeel,
  }
}

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

const SILHOUETTE_BLACK = '#111318'

// --- component --------------------------------------------------------------

export default function GolferSilhouette({
  player,
  stage = 1,
  className = '',
  showGround = true,
}) {
  const spec = player.silhouette
  const s = buildSkeleton(spec, player.id)
  const lit = new Set(STAGE_PARTS[Math.min(4, Math.max(1, stage))] ?? [])
  const colors = spec.colors ?? {}

  /** Fill/stroke colour for a named part at the current stage. */
  const paint = (part) => (lit.has(part) ? colors[part] ?? SILHOUETTE_BLACK : SILHOUETTE_BLACK)

  const b = s.build
  const limb = (base) => base * s.scale * (0.85 + b * 0.4)
  const armW = limb(17)
  const legW = limb(24)
  const shaftW = Math.max(2.6, 3.4 * s.scale)

  const mirrored = spec.hand === 'L'

  // Feet: a wedge from the ankle, lifted onto the toe when the pose says so.
  const foot = (ankle, heelLift, dir) => {
    const toeLen = 26 * s.scale * dir
    const lift = heelLift * 16 * s.scale
    const heelX = ankle.x - toeLen * 0.55
    return `M ${heelX} ${GROUND_Y - lift} L ${ankle.x + toeLen} ${GROUND_Y} L ${ankle.x + toeLen * 0.9} ${GROUND_Y + 5} L ${heelX} ${GROUND_Y + 5 - lift} Z`
  }

  const torsoPath = `M ${s.trailShoulder.x} ${s.trailShoulder.y}
     L ${s.leadShoulder.x} ${s.leadShoulder.y}
     L ${s.leadHip.x} ${s.leadHip.y}
     L ${s.trailHip.x} ${s.trailHip.y} Z`

  const headRx = s.dims.headR * 0.87
  const headRy = s.dims.headR

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
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
          {/* the ball, for scale and orientation */}
          <circle
            cx={VIEW_W / 2 + (mirrored ? -12 : 12)}
            cy={GROUND_Y + 1}
            r={5}
            className="fill-black/25 dark:fill-white/30"
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
        <g stroke={paint('skin')} strokeWidth={armW * 0.86} strokeLinecap="round" fill="none">
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

        {/* Torso */}
        <path
          d={torsoPath}
          fill={paint('shirt')}
          stroke={paint('shirt')}
          strokeWidth={legW * 0.72}
          strokeLinejoin="round"
        />

        {/* Neck + head */}
        <line
          x1={s.neck.x}
          y1={s.neck.y}
          x2={s.headCenter.x}
          y2={s.headCenter.y}
          stroke={paint('skin')}
          strokeWidth={16 * s.scale}
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
        <g stroke={paint('skin')} strokeWidth={armW * 0.86} strokeLinecap="round" fill="none">
          <path d={`M ${s.leadElbow.x} ${s.leadElbow.y} L ${s.hands.x} ${s.hands.y}`} />
        </g>

        {/* Hands / glove */}
        <circle cx={s.hands.x} cy={s.hands.y} r={armW * 0.62} fill={paint('skin')} />
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

export { VIEW_W, VIEW_H, GROUND_Y }
