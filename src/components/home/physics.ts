// Planck (Box2D) rigid-body world, wrapped for the hanging-chain scene.
//
// The page thinks in pixels; Planck simulates in metres. PPM is the only place
// the two meet — every value crossing this module's boundary is pixels.
// Screen y grows downward, so gravity is +y and a positive body angle reads as
// a clockwise CSS rotation: no axis flip anywhere.
//
// Bodies do the work the old Verlet integrator faked: a card is one rigid box
// that genuinely rotates (instead of a triangle of three point masses), and a
// chip is welded on with a real joint that can simply be destroyed to snap it
// off. `Point` survives as a read-only *view* — a named spot on a body, in
// stage pixels — so the renderers keep addressing the scene by index.

import {
  type Body,
  Box,
  Circle,
  DistanceJoint,
  type Joint,
  MouseJoint,
  RevoluteJoint,
  RopeJoint,
  Settings,
  Vec2,
  WeldJoint,
  World as PlanckWorld,
} from 'planck';

// 100 px/m puts a card at ~2.6 × 2 m and a chip at 0.2 m — comfortably inside
// the size range Box2D's solver is tuned for.
export const PPM = 100;
const m = (px: number) => px / PPM;

const DT = 1 / 60;
const VEL_ITERS = 10;
const POS_ITERS = 8;

// Box2D's stock sleep thresholds are ~1 px/s here — strict enough that a long
// serial chain never quite stops twitching and so never sleeps, and a scene that
// never sleeps pays full solver cost on every frame forever. These are still far
// below anything the eye can catch (~8 px/s, ~7°/s), and sleeping is what makes
// a settled chain essentially free. Planck keeps them as globals; this module is
// the only physics in the app, so setting them once here is safe.
Settings.linearSleepTolerance = 0.08;
Settings.angularSleepTolerance = 0.12;

// Rope nodes are pure point masses and never collide with anything. Cards,
// boxes, loose chips and the ground plane all collide with each other, so a
// dragged card shoulders its neighbours aside and snapped chips pile up.
const CAT_PHANTOM = 0x0001;
const CAT_CHIP = 0x0002;
const CAT_GROUND = 0x0004;
const CAT_BODY = 0x0008;

// How far a soft rope may be stretched before it goes taut. Without a ceiling a
// sustained drag keeps winning against the spring and the rope reads as elastic.
const ROPE_MAX_STRETCH = 2.2;

// Near-free-fall for anything that has been cut loose.
const FALL_DAMPING = 0.4;
const CHIP_MASK = CAT_CHIP | CAT_GROUND | CAT_BODY;
const BODY_MASK = CAT_BODY | CAT_CHIP | CAT_GROUND;

/** A named spot on a body, reported in stage pixels. Refreshed by `sync()`. */
export interface Point {
  x: number; // stage px — read-only for consumers
  y: number;
  r: number; // px radius, used for hit tests and rest offsets
  pinned: boolean; // static body — never moves
  held: boolean; // currently dragged by the pointer
  body: Body;
  lx: number; // offset from the body origin, px, in body-local axes
  ly: number;
}

/** A drawn link between two points. Rope segments and chip welds are joints;
 *  breaking one destroys the joint (and `reset()` puts it back). */
export interface Stick {
  a: number; // point index
  b: number;
  joint: Joint | null;
  broken: boolean;
  remake: (() => Joint | null) | null;
}

/** Every body's transform, in Planck's own units — a pose to interpolate from
 *  or snap back to. Indexed by `world.bodies`. */
export type Pose = { x: number; y: number; a: number }[];

/**
 * One hanging strand: an anchor, the rope that drops from it, and the card or
 * ball on the end. Indices are into `world.bodies`, except `load`, which is a
 * *point* — a card's rope meets it at a spot on its top edge, not at its centre.
 *
 * `nodes` is the rope alone, ceiling → load, so it can be paid out; `bodies` is
 * everything dynamic the strand carries, welded chips included, so it can be
 * pulled off plumb as one piece.
 */
export interface Strand {
  rope: number; // px from the anchor down to the load
  clear: number; // px above the anchor the load starts a drop-in — see `payOut`
  anchor: number; // the pinned ceiling body
  load: number; // point index — where the rope ends
  nodes: number[];
  bodies: number[];
}

export interface World {
  pl: PlanckWorld;
  points: Point[];
  sticks: Stick[];
  bodies: Body[];
  ground: Body; // static anchor for the drag joint
  w: number; // stage size, px
  h: number;
  floor: number; // px above the bottom edge where the ground plane sits
  damping: number; // per-frame velocity retention (Verlet-era units)
  ropeHz: number; // rope give — see WorldOpts
  rest: Pose; // body transforms at scene build
  drag: MouseJoint | null;
}

export interface WorldOpts {
  w: number;
  h: number;
  gravity: number; // px/s²
  damping: number; // per-frame velocity retention, 0..1
  floor: number;
  /**
   * Rope give, in Hz. 0 is a perfectly rigid link. A few Hz lets a hard pull
   * stretch the rope well past its length and, at critical damping, return
   * without a single oscillation — reach without bounce. Only safe where each
   * rope carries one body: on a serial strand every link also carries
   * everything below it, and the stretch compounds down the chain.
   */
  ropeHz: number;
}

/**
 * Box2D damps as `v /= 1 + dt·d` per step, the old integrator as `v *= k` per
 * frame. Matching them keeps the swing decaying at the same rate it always did.
 */
const dampingCoeff = (retention: number) => (1 / retention - 1) / DT;

export function createWorld(opts: WorldOpts): World {
  const pl = new PlanckWorld({ gravity: new Vec2(0, m(opts.gravity)) });
  const ground = pl.createBody();

  // Ground plane + side walls, thick enough that nothing tunnels through.
  const T = m(40);
  const floorY = m(opts.h - opts.floor);
  const wall = (cx: number, cy: number, hw: number, hh: number) =>
    pl.createBody({ position: new Vec2(cx, cy) }).createFixture({
      shape: new Box(hw, hh),
      friction: 0.6,
      filterCategoryBits: CAT_GROUND,
      filterMaskBits: CAT_CHIP,
    });
  const halfW = m(opts.w) / 2;
  const halfH = m(opts.h) / 2;
  wall(halfW, floorY + T, halfW + T, T); // floor
  wall(-T, halfH, T, halfH + T); // left
  wall(m(opts.w) + T, halfH, T, halfH + T); // right

  return {
    pl,
    points: [],
    sticks: [],
    bodies: [],
    ground,
    w: opts.w,
    h: opts.h,
    floor: opts.floor,
    damping: opts.damping,
    ropeHz: opts.ropeHz,
    rest: [],
    drag: null,
  };
}

// --- construction ----------------------------------------------------------

interface BodyOpts {
  x: number; // centre, stage px
  y: number;
  mass: number; // arbitrary but consistent units across the scene
  pinned?: boolean; // static
  rotates?: boolean; // false → fixedRotation (rope nodes are point masses)
  collides?: boolean; // false → phantom (no contacts at all)
}

function makeBody(world: World, o: BodyOpts): Body {
  const damp = dampingCoeff(world.damping);
  const body = o.pinned
    ? world.pl.createBody({ position: new Vec2(m(o.x), m(o.y)) })
    : world.pl.createBody({
        type: 'dynamic',
        position: new Vec2(m(o.x), m(o.y)),
        fixedRotation: o.rotates === false,
        linearDamping: damp,
        angularDamping: damp,
      });
  world.bodies.push(body);
  return body;
}

/** A disc body (rope node, chip, stack ball) plus the point that tracks it. */
export function addDisc(
  world: World,
  o: BodyOpts & { r: number },
): { body: Body; point: number } {
  const body = makeBody(world, o);
  const rm = m(o.r);
  if (!o.pinned)
    body.createFixture({
      shape: new Circle(rm),
      // density is derived so the body lands on exactly the mass we solved for
      density: o.mass / (Math.PI * rm * rm),
      friction: 0.5,
      restitution: 0.12,
      filterCategoryBits: o.collides ? CAT_CHIP : CAT_PHANTOM,
      filterMaskBits: o.collides ? CHIP_MASK : 0,
    });
  return { body, point: addNode(world, body, o.x, o.y, o.r) };
}

/** A rectangular body (experience card / mobile box). Nodes are added by the
 *  caller, which knows where the rope attaches and where the corners sit. */
export function addBoxBody(
  world: World,
  o: BodyOpts & { w: number; h: number },
): Body {
  const body = makeBody(world, o);
  const hw = m(o.w) / 2;
  const hh = m(o.h) / 2;
  body.createFixture({
    shape: new Box(hw, hh),
    density: o.mass / (m(o.w) * m(o.h)),
    friction: 0.4,
    restitution: 0.05, // cards shove each other, they don't bounce off
    filterCategoryBits: o.collides ? CAT_BODY : CAT_PHANTOM,
    filterMaskBits: o.collides ? BODY_MASK : 0,
  });
  return body;
}

/** Pins a tracked point to a spot on a body, given in stage px. */
export function addNode(
  world: World,
  body: Body,
  x: number,
  y: number,
  r: number,
): number {
  const local = body.getLocalPoint(new Vec2(m(x), m(y)));
  world.points.push({
    x,
    y,
    r,
    pinned: body.isStatic(),
    held: false,
    body,
    lx: local.x * PPM,
    ly: local.y * PPM,
  });
  return world.points.length - 1;
}

function pushStick(
  world: World,
  a: number,
  b: number,
  make: () => Joint | null,
): number {
  world.sticks.push({
    a,
    b,
    joint: world.pl.createJoint(make() as Joint),
    broken: false,
    remake: () => world.pl.createJoint(make() as Joint),
  });
  return world.sticks.length - 1;
}

/**
 * One rope link: holds two points a fixed distance apart while letting the
 * chain fold freely at every node — the exact analogue of the old Verlet stick,
 * minus the stretch.
 *
 * It has to be a distance joint anchored centre-to-centre. A revolute joint
 * would put one body's anchor at an offset, and since rope nodes have fixed
 * rotation that offset can never turn — which silently welds the whole rope
 * into one rigid bar that cannot bend or swing.
 *
 * `limit` (radians) switches to a hinge with a capped relative angle, for the
 * last link, where the rope meets a card: the two points coincide there, and a
 * zero-length distance joint is degenerate. Because the rope node it hinges
 * from is fixed at angle 0, that relative cap *is* the card's absolute tilt — a
 * card can swing, but can never turn over.
 */
export function link(
  world: World,
  a: number,
  b: number,
  limit?: number,
): number {
  const A = world.points[a];
  const B = world.points[b];
  const stick = pushStick(world, a, b, () =>
    limit === undefined
      ? new DistanceJoint(
          { frequencyHz: world.ropeHz, dampingRatio: 1 },
          A.body,
          B.body,
          new Vec2(m(A.x), m(A.y)),
          new Vec2(m(B.x), m(B.y)),
        )
      : new RevoluteJoint(
          { enableLimit: true, lowerAngle: -limit, upperAngle: limit },
          A.body,
          B.body,
          new Vec2(m(B.x), m(B.y)),
        ),
  );
  // A soft link needs a ceiling on how far it can be pulled, or a drag that
  // keeps pulling stretches it without bound. Never broken, so it is not a
  // stick — nothing draws it and `reset()` has nothing to restore.
  if (limit === undefined && world.ropeHz > 0) {
    const len = m(Math.hypot(B.x - A.x, B.y - A.y));
    world.pl.createJoint(
      new RopeJoint({
        bodyA: A.body,
        bodyB: B.body,
        localAnchorA: new Vec2(0, 0),
        localAnchorB: new Vec2(0, 0),
        maxLength: len * ROPE_MAX_STRETCH,
      }),
    );
  }
  return stick;
}

/** Welds a chip rigidly to its card at the border point it sprouts from. */
export function weld(
  world: World,
  card: number,
  chip: number,
  anchorX: number,
  anchorY: number,
): number {
  const A = world.points[card];
  const B = world.points[chip];
  const anchor = new Vec2(m(anchorX), m(anchorY));
  return pushStick(
    world,
    card,
    chip,
    () => new WeldJoint({}, A.body, B.body, anchor),
  );
}

// --- simulation ------------------------------------------------------------

/** Refreshes every point's cached stage position from its body's transform. */
export function sync(world: World): void {
  for (const p of world.points) {
    const t = p.body.getTransform();
    if (p.lx === 0 && p.ly === 0) {
      p.x = t.p.x * PPM;
      p.y = t.p.y * PPM;
    } else {
      p.x = t.p.x * PPM + t.q.c * p.lx - t.q.s * p.ly;
      p.y = t.p.y * PPM + t.q.s * p.lx + t.q.c * p.ly;
    }
  }
}

export function step(world: World): void {
  world.pl.step(DT, VEL_ITERS, POS_ITERS);
  sync(world);
}

/**
 * Settles the scene before first paint so it fades in already at rest, and
 * snapshots that rest pose for `reset()`. This runs synchronously on load, so it
 * bails out as soon as the scene stops moving — `maxFrames` is only a backstop.
 */
export function warmStart(world: World, maxFrames: number): number {
  let frames = 0;
  let still = 0;
  for (; frames < maxFrames; frames++) {
    world.pl.step(DT, VEL_ITERS, POS_ITERS);
    // Stop as soon as nothing is visibly moving — not once Box2D has formally
    // put the scene to sleep, which on a long strand takes several times longer
    // for motion the eye cannot see. The rAF loop finishes the job for free.
    if (frames % 5 !== 0 || frames < 20) continue;
    still = maxSpeed(world) < 0.05 ? still + 1 : 0;
    if (still >= 3) break;
  }
  sync(world);
  world.rest = pose(world);
  return frames;
}

/** Snapshots where every body currently is, so an animation can interpolate
 *  from it without the scene's own history getting overwritten. */
function pose(world: World): Pose {
  return world.bodies.map((b) => {
    const p = b.getPosition();
    return { x: p.x, y: p.y, a: b.getAngle() };
  });
}

/** Fastest body in the scene, in px/frame — drives the "settled" reveal cue.
 *  Sleeping bodies are skipped: Box2D only sleeps what has already stopped. */
export function maxSpeed(world: World): number {
  let max = 0;
  for (const b of world.bodies) {
    if (!b.isDynamic() || !b.isAwake()) continue;
    const v = b.getLinearVelocity();
    const sp = Math.hypot(v.x, v.y);
    if (sp > max) max = sp;
  }
  return (max * PPM) / 60;
}

/**
 * A serial pendulum chain has no bending stiffness, so a hard fling can whip a
 * body past vertical and tangle the strand. Capping speed bleeds off that
 * energy without stopping ordinary swinging.
 */
export function clampSpeed(world: World, maxPxPerFrame: number): void {
  const cap = (maxPxPerFrame * 60) / PPM;
  for (const b of world.bodies) {
    if (!b.isDynamic() || !b.isAwake()) continue;
    // Its low damping marks a body that has been cut loose: it is falling, not
    // part of any chain, so there is nothing to tangle and nothing to cap.
    if (b.getLinearDamping() === FALL_DAMPING) continue;
    const v = b.getLinearVelocity();
    const sp = Math.hypot(v.x, v.y);
    if (sp > cap)
      b.setLinearVelocity(new Vec2((v.x / sp) * cap, (v.y / sp) * cap));
  }
}

/**
 * Scrolling accelerates the anchors, not the hanging masses. In the page's
 * frame that is a pseudo-force on every free body — the same velocity change
 * regardless of mass — so the strand lags behind its anchors and swings.
 * `dx`/`dy` are px/frame.
 */
export function nudge(world: World, dx: number, dy: number): void {
  const vx = (dx * 60) / PPM;
  const vy = (dy * 60) / PPM;
  const held = world.drag?.getBodyB() ?? null; // under the pointer, not the page
  for (const b of world.bodies) {
    if (!b.isDynamic() || b === held) continue;
    const v = b.getLinearVelocity();
    b.setLinearVelocity(new Vec2(v.x + vx, v.y + vy));
    b.setAwake(true);
  }
}

/**
 * Pulls each strand off plumb by its own angle and holds it there, as if it had
 * been dragged aside: a body slides horizontally in proportion to how far it
 * hangs below the anchor line, and turns by the same angle. Step the world again
 * and the strands swing back through vertical on their own.
 *
 * `angles` is per strand and signed, so no two cards arrive leaning the same way
 * or by the same amount — and since they do not share a length either, they do
 * not share a period, and drift out of phase within a second of being released.
 *
 * This is a shear, not a true rotation of the strand about its anchor — but the
 * anchor sits on the same line the shear is measured from, so for a small angle
 * the two agree to first order (a few tenths of a pixel over the longest rope
 * here, which the position solver absorbs in a frame). A rigid transform of a
 * strand leaves every joint in it already satisfied, welded chips included.
 */
export function lean(
  world: World,
  strands: Strand[],
  angles: number[],
  anchorY: number,
): void {
  const ay = m(anchorY);
  strands.forEach((s, si) => {
    const angle = angles[si] ?? 0;
    const t = Math.tan(angle);
    for (const i of s.bodies) {
      const b = world.bodies[i];
      if (!b || !b.isDynamic()) continue;
      const p = b.getPosition();
      const drop = p.y - ay;
      if (drop <= 0) continue;
      // Turn only what can turn. A rope node's angle is frozen but still
      // readable, and the card's hinge limit is measured *against* it — so
      // spinning the node would rotate the card's whole permitted range with it,
      // a few degrees more on every lean, until a card's own level pose sat
      // against the stop.
      const a = b.isFixedRotation() ? b.getAngle() : b.getAngle() + angle;
      b.setTransform(new Vec2(p.x + drop * t, p.y), a);
      b.setLinearVelocity(new Vec2(0, 0));
      b.setAngularVelocity(0);
      b.setAwake(true);
    }
  });
  sync(world); // nothing steps while the scene is held, so refresh the points
}

/**
 * How far a slack rope bows out, as a fraction of its own length, at its
 * slackest. Measured rather than picked: at 0.4 the drawn curve stays within a
 * few percent of the rope's true length across the part of the payout you can
 * actually see (half out to fully out), so the rope reads as bending rather than
 * as stretching or shrinking. Turning it down straightens the rope back into the
 * rigid bar it looked like before.
 */
const ROPE_BOW = 0.4;

/**
 * Everything the drop-in needs to place one strand, worked out once from the
 * pose it will come home to. Distances are in Planck's units, not pixels.
 */
interface DropStrand {
  rope: number; // the rope's own length
  lift: number; // 1 + clear/rope — the load's whole trip, as a multiple of it
  ax: number; // the anchor. It does not move — that is the whole point.
  ay: number;
  lx: number; // where the rope meets the load, at rest
  ly: number;
  nodes: number[]; // the rope's bodies …
  us: number[]; // … and how far along the rope each one sits, 0 → 1
  carried: number[]; // the load and everything welded to it, moved as one
}

/** The scene's drop-in pose, captured the moment it is taken over. */
export interface Drop {
  base: Pose;
  strands: DropStrand[];
}

/**
 * Freezes the pose a drop-in will interpolate from and back to. Take it after
 * leaning the chain, not before — the lean is part of the pose the strands come
 * home to.
 */
export function dropFrom(world: World, strands: Strand[]): Drop {
  const base = pose(world);
  return {
    base,
    strands: strands.map((s) => {
      const a = base[s.anchor];
      const load = world.points[s.load];
      const ly = m(load.y);
      const span = ly - a.y;
      const rope = new Set(s.nodes);
      return {
        rope: m(s.rope),
        lift: 1 + s.clear / s.rope,
        ax: a.x,
        ay: a.y,
        lx: m(load.x),
        ly,
        nodes: s.nodes,
        // Read off the straight pose rather than assumed even: the ball's rope
        // ends a segment short of its load, the cards' ropes end right on it.
        us: s.nodes.map((i) => (span ? (base[i].y - a.y) / span : 1)),
        carried: s.bodies.filter((i) => !rope.has(i)),
      };
    }),
  };
}

/**
 * Drops each load down its own rope. `p` runs 0 → 1: at 0 the card or ball sits
 * a clear `Strand.clear` above its anchor, out of frame, with nothing of its
 * rope showing but the stub between the anchor and the top of the stage; at 1 it
 * hangs at the end of a full-length rope, exactly where the scene was built to
 * hold it. Past 1 it hangs lower than the rope is long, so an ease that
 * overshoots reads as the rope going taut and stretching.
 *
 * The anchor never moves. It is the one fixed point in the drop-in, which is why
 * the rope reads as coming out of the ceiling rather than arriving with the card
 * — and the load is what falls, on screen, well after the stage carrying it has
 * already landed. A load moves rigidly, welded chips and all, so its joints stay
 * satisfied and nothing drifts off it.
 *
 * The rope does not shrink to fit. Its nodes keep their spacing along it, and
 * the difference between its length and the gap it has to span is slack — which
 * cannot hang straight between two points one above the other, so it buckles to
 * one side. That bow is what makes the payout visible at all: drawn straight, a
 * short rope and a long one look like the same rope at different scales.
 *
 * Placement is absolute, from the captured pose, so this runs every frame
 * without drifting — and it must, because nothing steps meanwhile.
 */
export function payOut(world: World, drop: Drop, p: number): void {
  const { base } = drop;
  for (const s of drop.strands) {
    // The load's trip up past its own anchor, and everything that rides with it.
    // Past the end of the rope it is no longer falling, it is stretching the
    // rope, so that part is measured against the rope instead of against the
    // whole trip — every strand then gives by the same fraction of its own
    // length, which is what a rope's stretch means. The change of pace where the
    // two meet lands exactly on p = 1: that abruptness is the rope going taut.
    const k = p <= 1 ? (1 - p) * s.lift : 1 - p;
    const ox = (s.ax - s.lx) * k;
    const oy = (s.ay - s.ly) * k;
    for (const i of s.carried)
      place(world.bodies[i], base[i].x + ox, base[i].y + oy);
    const lx = s.lx + ox;
    const ly = s.ly + oy;
    // The bow follows the geometry, not the clock: how much rope there is over
    // and above the gap it has to span. None when the gap is the rope's own
    // length (taut) and none when there is no gap at all (nothing to bow), most
    // half way between — and to whichever side the strand leans, so the rope
    // buckles the way the card will swing. While the load is still above its
    // anchor the gap runs long, which clamps to taut: no bow, and nothing in
    // frame to show it anyway.
    const dx = s.ax - lx;
    const dy = s.ay - ly;
    const len = Math.hypot(dx, dy) || 1;
    const q = Math.min(1, len / s.rope);
    const bow =
      2 * s.rope * ROPE_BOW * 4 * q * (1 - q) * Math.sign(s.lx - s.ax || 1);
    const cx = (s.ax + lx) / 2 - (dy / len) * bow; // quadratic control point
    const cy = (s.ay + ly) / 2 + (dx / len) * bow;
    for (let j = 0; j < s.nodes.length; j++) {
      const u = s.us[j];
      const v = 1 - u;
      place(
        world.bodies[s.nodes[j]],
        v * v * s.ax + 2 * u * v * cx + u * u * lx,
        v * v * s.ay + 2 * u * v * cy + u * u * ly,
      );
    }
  }
  sync(world);
}

/** Teleports a body, leaving it still. Placement only — no force reaches the
 *  scene, which is what lets a held pose survive being animated through. */
function place(body: Body | undefined, x: number, y: number): void {
  if (!body) return;
  body.setTransform(new Vec2(x, y), body.getAngle());
  if (!body.isDynamic()) return; // an anchor is static — nothing to still
  body.setLinearVelocity(new Vec2(0, 0));
  body.setAngularVelocity(0);
  body.setAwake(true);
}

// --- snapping --------------------------------------------------------------

/** Cuts a link. Destroying the weld is the whole chip-snap mechanic: the card
 *  then tilts on its own, because its balance genuinely changed. */
export function breakStick(world: World, index: number): void {
  const s = world.sticks[index];
  if (!s || s.broken) return;
  s.broken = true;
  if (s.joint) world.pl.destroyJoint(s.joint);
  s.joint = null;
  const chip = world.points[s.b];
  // The scene's damping exists to kill *swing*; on something in free fall it
  // just caps the drop at a drifting terminal velocity. A cut-loose chip is no
  // longer part of any chain, so it gets to fall properly.
  chip.body.setLinearDamping(FALL_DAMPING);
  chip.body.setAngularDamping(FALL_DAMPING);
  // It also has to start colliding with the floor now that it is falling.
  for (let f = chip.body.getFixtureList(); f; f = f.getNext()) {
    f.setFilterData({
      groupIndex: 0,
      categoryBits: CAT_CHIP,
      maskBits: CHIP_MASK,
    });
  }
  chip.body.setAwake(true);
}

/** Restores every body to its post-warm-start transform and re-welds the chips
 *  that were snapped off. */
export function reset(world: World): void {
  release(world);
  const damp = dampingCoeff(world.damping);
  world.bodies.forEach((b, i) => {
    const r = world.rest[i];
    if (!r) return;
    if (b.isDynamic()) {
      b.setLinearDamping(damp); // undo the free-fall damping of snapped chips
      b.setAngularDamping(damp);
    }
    b.setTransform(new Vec2(r.x, r.y), r.a);
    b.setLinearVelocity(new Vec2(0, 0));
    b.setAngularVelocity(0);
    b.setAwake(true);
  });
  for (const s of world.sticks) {
    if (!s.broken) continue;
    s.broken = false;
    s.joint = s.remake ? s.remake() : null;
  }
  for (const p of world.points) p.held = false;
  sync(world);
}

// --- dragging --------------------------------------------------------------

/**
 * Grabs a body with a mouse joint, so it stays under the pointer while the rest
 * of the chain keeps reacting to it — and lets go carrying real momentum.
 */
export function grab(world: World, point: number, x: number, y: number): void {
  release(world);
  const p = world.points[point];
  if (p.pinned) return;
  p.held = true;
  // A settled scene is asleep, and Box2D does not wake a body just because a
  // joint was attached to it — without this the grab silently does nothing.
  p.body.setAwake(true);
  world.drag = world.pl.createJoint(
    new MouseJoint(
      { maxForce: 9000 * p.body.getMass(), frequencyHz: 25, dampingRatio: 1 },
      world.ground,
      p.body,
      new Vec2(m(x), m(y)),
    ),
  );
}

export function dragTo(world: World, x: number, y: number): void {
  world.drag?.setTarget(new Vec2(m(x), m(y)));
}

export function release(world: World): void {
  if (world.drag) world.pl.destroyJoint(world.drag);
  world.drag = null;
  for (const p of world.points) p.held = false;
}
