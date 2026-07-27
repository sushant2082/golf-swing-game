/**
 * Swing kinematics for the procedural silhouette.
 *
 * A small forward-kinematic skeleton: pelvis → spine → shoulders → arms → club,
 * and pelvis → legs → feet. Pure geometry, no rendering — `GolferSilhouette`
 * turns the joint positions this produces into SVG.
 *
 * All poses are authored for a RIGHT-handed golfer viewed face-on, with the
 * target to the viewer's right. Left-handers are mirrored at render time.
 */

const VIEW_W = 400
const VIEW_H = 520
const GROUND_Y = 482
/**
 * The figure never occupies the top of the coordinate space, so the rendered
 * viewBox crops it — otherwise the puzzle panel is mostly empty sky and pushes
 * the guess input below the fold on a phone.
 */
const VIEW_TOP = 58

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
    label: 'the takeaway',
    spine: -8,
    hipScale: 0.9,
    hipTilt: -2,
    shoulderScale: 0.7,
    shoulderTilt: 15,
    headTilt: 4,
    leadArm: 196,
    leadElbow: 6,
    trailElbowSign: 1,
    club: 252,
    clubLen: 140,
    leadThigh: 166,
    leadShin: 176,
    trailThigh: 194,
    trailShin: 184,
    trailHeel: 0,
  },
  top: {
    label: 'the top of the backswing',
    spine: -15,
    hipScale: 0.76,
    hipTilt: -4,
    shoulderScale: 0.5,
    shoulderTilt: 27,
    headTilt: 10,
    leadArm: -44,
    leadElbow: 10,
    trailElbowSign: 1,
    club: 104,
    clubLen: 148,
    leadThigh: 167,
    leadShin: 177,
    trailThigh: 193,
    trailShin: 183,
    trailHeel: 0,
  },
  impact: {
    label: 'impact',
    spine: -17,
    hipScale: 0.84,
    hipTilt: -7,
    shoulderScale: 0.72,
    shoulderTilt: 9,
    headTilt: 7,
    leadArm: 172,
    leadElbow: 2,
    trailElbowSign: -1,
    club: 190,
    clubLen: 148,
    leadThigh: 168,
    leadShin: 172,
    trailThigh: 196,
    trailShin: 170,
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
    clubLen: 132,
    leadThigh: 170,
    leadShin: 174,
    trailThigh: 202,
    trailShin: 158,
    trailHeel: 1,
  },
}

// --- skeleton ---------------------------------------------------------------

/** Base limb lengths, before the per-player height scale. */
const DIM = {
  hipWidth: 48,
  torso: 116,
  shoulderWidth: 84,
  neck: 10,
  headR: 24,
  upperArm: 66,
  foreArm: 60,
  thigh: 88,
  shin: 84,
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
    club: (pose.clubLen ?? 148) * scale,
  }

  // Nominal pelvis height; the whole figure is shifted after the fact so
  // whichever foot is lowest lands exactly on the turf.
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

  // Pose angles change how much height the legs actually consume, so drop the
  // whole figure until the lowest foot rests on the turf. Without this, wide
  // stances sink through the ground and narrow ones float above it.
  const joints = {
    pelvis,
    leadHip,
    trailHip,
    neck,
    leadShoulder,
    trailShoulder,
    headCenter,
    leadElbow,
    trailElbow,
    hands,
    clubHead,
    clubButt,
    leadKnee,
    leadAnkle,
    trailKnee,
    trailAnkle,
  }
  const dy = GROUND_Y - Math.max(leadAnkle.y, trailAnkle.y)
  for (const p of Object.values(joints)) p.y += dy

  return { pose, dims: d, build, scale, headAngle, trailHeel: pose.trailHeel, ...joints }
}

export { VIEW_W, VIEW_H, VIEW_TOP, GROUND_Y }
