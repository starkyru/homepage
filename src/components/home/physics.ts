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
  type Fixture,
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
// Screen-fixed chrome (nav buttons, the accordion).
const CAT_HUD = 0x0010;
// A chip that has been snapped off, as opposed to everything else wearing
// CAT_CHIP — the stack ball wears it too. Only these land on the chrome: the
// accordion opening is not allowed to shoulder the big ball out of the way, nor
// a card, nor a whole mobile strand on every scroll.
const CAT_LOOSE = 0x0020;

// How far a soft rope may be stretched before it goes taut. Without a ceiling a
// sustained drag keeps winning against the spring and the rope reads as elastic.
const ROPE_MAX_STRETCH = 2.2;

// Near-free-fall for anything that has been cut loose.
const FALL_DAMPING = 0.4;
const CHIP_MASK = CAT_CHIP | CAT_GROUND | CAT_BODY | CAT_HUD;
const BODY_MASK = CAT_BODY | CAT_CHIP | CAT_GROUND;
// What a chip lying around collides with. Pointedly not CAT_CHIP, which is also
// what the stack ball wears: the accordion opening under a pile of chips lifts
// them, and if they could lean on the ball it would shove the whole chain about.
// Rockets are the exception and re-add it — see `launch`.
const LOOSE_MASK = CAT_LOOSE | CAT_GROUND | CAT_BODY | CAT_HUD;

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
  // It also has to start colliding with the floor now that it is falling, and
  // with the chrome, which only cut-loose chips are allowed to land on.
  for (let f = chip.body.getFixtureList(); f; f = f.getNext()) {
    f.setFilterData({
      groupIndex: 0,
      categoryBits: CAT_CHIP | CAT_LOOSE,
      maskBits: LOOSE_MASK,
    });
  }
  chip.body.setAwake(true);
}

// --- solid chrome ------------------------------------------------------------

/**
 * A piece of screen-fixed chrome made solid, so snapped-off chips land on it
 * instead of dropping through: a nav button, the accordion panel.
 *
 * **Kinematic, driven by velocity** — not static and teleported. A teleported
 * body carries nothing: the panel would slide out from under a chip lying on it
 * on every scroll, and rise straight through one when the accordion opens. Given
 * a velocity instead, Box2D solves it as the moving platform it is, so friction
 * drags a resting chip sideways and the opening panel lifts it.
 *
 * **A shelf, not a slab of the whole element.** Only the top edge can be landed
 * on, and a fixed thickness means the fixture is built once and kept: rebuilding
 * it as the accordion animates would destroy the contact every frame, and a
 * contact that never survives a step never pushes anything anywhere. (Tunnelling
 * is not the risk it looks like — Box2D runs continuous collision for dynamic
 * against non-dynamic, so a fast chip cannot pass through a thin shelf.)
 *
 * These are deliberately kept out of `world.bodies`. That array is the scene,
 * indexed in step with `world.rest`, and chrome is not part of the scene.
 */
export interface Solid {
  body: Body;
  fixture: Fixture | null;
  circle: boolean;
  w: number; // px of the fixture as last built
  h: number;
}

/** How deep the landing surface of a box is. Chips rest on its top face. */
const SHELF = 20;
/** Past this, the element did not move — it was re-laid-out. Teleport instead. */
const JUMP = 200;

export function addSolid(world: World, circle: boolean): Solid {
  return {
    body: world.pl.createBody({ type: 'kinematic', position: new Vec2(0, 0) }),
    fixture: null,
    circle,
    w: 0,
    h: 0,
  };
}

/**
 * Puts the solid where its element now is — the element's centre and size in
 * stage px — and returns whether it actually moved, which is the caller's cue to
 * wake whatever may be resting on it.
 *
 * A box becomes a shelf across the element's top edge; a circle stays a circle.
 */
export function moveSolid(
  s: Solid,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const deep = s.circle ? h : Math.min(h, SHELF);
  // A box is anchored to the top edge, so growing downward (or upward, which is
  // how the accordion grows) moves the shelf rather than resizing it.
  const cy = s.circle ? y : y - h / 2 + deep / 2;
  // Width changes are real layout changes and rare; depth is fixed by SHELF.
  const resized = Math.abs(w - s.w) > 2 || Math.abs(deep - s.h) > 2;
  if (resized) {
    if (s.fixture) s.body.destroyFixture(s.fixture);
    s.w = w;
    s.h = deep;
    s.fixture = s.body.createFixture({
      shape: s.circle
        ? new Circle(m(Math.min(w, deep) / 2))
        : new Box(m(w) / 2, m(deep) / 2),
      friction: 0.6,
      restitution: 0.05, // chips settle on the panel, they don't bounce off it
      filterCategoryBits: CAT_HUD,
      filterMaskBits: CAT_LOOSE,
    });
  }

  if (!s.body.isActive()) {
    s.body.setActive(true);
    s.body.setTransform(new Vec2(m(x), m(cy)), 0);
    s.body.setLinearVelocity(new Vec2(0, 0));
    return true;
  }

  const at = s.body.getPosition();
  const dx = m(x) - at.x;
  const dy = m(cy) - at.y;
  const moved = Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005;
  if (Math.abs(dx) > m(JUMP) || Math.abs(dy) > m(JUMP)) {
    s.body.setTransform(new Vec2(m(x), m(cy)), 0);
    s.body.setLinearVelocity(new Vec2(0, 0));
  } else if (moved) {
    // Exactly the velocity that lands on the target after one step, so the shelf
    // tracks its element to the pixel and still pushes like a moving platform.
    s.body.setLinearVelocity(new Vec2(dx / DT, dy / DT));
    s.body.setAwake(true);
  } else {
    s.body.setLinearVelocity(new Vec2(0, 0));
  }
  return moved || resized;
}

/** Its element is hidden or gone — stop colliding with it. */
export function idleSolid(s: Solid): void {
  if (!s.body.isActive()) return;
  s.body.setLinearVelocity(new Vec2(0, 0));
  s.body.setActive(false);
}

export function destroySolid(world: World, s: Solid): void {
  world.pl.destroyBody(s.body);
}

/**
 * Wakes everything that has been cut loose. Its free-fall damping is what marks
 * it: a chip resting on a panel that just moved has to be re-solved, and a
 * sleeping body would simply be left standing in mid-air.
 */
export function wakeLoose(world: World): void {
  for (const b of world.bodies) {
    if (b.isDynamic() && b.getLinearDamping() === FALL_DAMPING)
      b.setAwake(true);
  }
}

// --- launching ---------------------------------------------------------------

/** Upward thrust as a multiple of gravity, so the rise reads like the fall. */
const THRUST_G = 1.15;
const LAUNCH_KICK = 220; // px/s off the mark, so the very first frame moves
const LAUNCH_SPIN = 7; // rad/s tumble on the way up

/**
 * Sends a cut-loose chip up under its own thrust. Negative gravity scale rather
 * than an impulse: the ask is a rocket, and a rocket accelerates the whole way
 * up instead of coasting off one kick.
 *
 * On the way up it collides with other chips and with nothing else. Two of them
 * launched together knock each other out of the sky, and one climbing into a
 * chip lying on the panel scatters it — but a chip under thrust punching through
 * a hanging card would knock the entire chain about, and a firework that
 * shoulders the scenery aside on the way past reads as a bug, not a firework.
 */
export function launch(world: World, point: number): void {
  const b = world.points[point].body;
  if (!b.isDynamic()) return;
  b.setGravityScale(-THRUST_G);
  b.setLinearVelocity(new Vec2(0, -LAUNCH_KICK / PPM));
  b.setAngularVelocity((Math.random() < 0.5 ? -1 : 1) * LAUNCH_SPIN);
  for (let f = b.getFixtureList(); f; f = f.getNext()) {
    f.setFilterData({
      groupIndex: 0,
      categoryBits: CAT_CHIP | CAT_LOOSE,
      // Balls only — the big one included, which a rocket is welcome to shove.
      maskBits: CAT_CHIP | CAT_LOOSE,
    });
  }
  b.setAwake(true);
}

/**
 * Whatever a body is in contact with. Opaque to callers — it exists only to be
 * handed back to `struck`, which is what keeps the engine's own types in here.
 */
export type Contacts = Set<Body>;

/** Everything a body is touching right now. */
export function touching(world: World, point: number): Contacts {
  const b = world.points[point].body;
  const out: Contacts = new Set();
  for (let ce = b.getContactList(); ce; ce = ce.next) {
    if (ce.contact?.isTouching() && ce.other) out.add(ce.other);
  }
  return out;
}

/** A card, a box or another chip — as opposed to the ground or the chrome. */
function isScenery(b: Body): boolean {
  for (let f = b.getFixtureList(); f; f = f.getNext()) {
    if (f.getFilterCategoryBits() & (CAT_BODY | CAT_CHIP)) return true;
  }
  return false;
}

/**
 * Has a chip run into something new — a card, a box, another chip?
 *
 * `except` is whatever it was already touching when it was armed or launched:
 * the pile it was lying in, the neighbour it was leaning on. Without that, a
 * chip touching anything at all would register a hit on its first frame and go
 * off where it stands; a plain "has it moved far enough yet" clearance would
 * instead miss exactly the short-range hits worth catching.
 *
 * The ground and the chrome are not hits. Landing on the accordion is how a chip
 * comes to rest on the accordion.
 */
export function struck(world: World, point: number, except: Contacts): boolean {
  const b = world.points[point].body;
  for (let ce = b.getContactList(); ce; ce = ce.next) {
    const other = ce.other;
    if (!ce.contact?.isTouching() || !other) continue;
    if (!except.has(other) && isScenery(other)) return true;
  }
  return false;
}

/**
 * Cuts the thrust: it hit something on the way up, so it is a falling chip again
 * — keeping whatever the impact left it with, which is what makes it drop away
 * from the collision rather than blink out of it.
 */
export function abortLaunch(world: World, point: number): void {
  const b = world.points[point].body;
  b.setGravityScale(1);
  for (let f = b.getFixtureList(); f; f = f.getNext()) {
    f.setFilterData({
      groupIndex: 0,
      categoryBits: CAT_CHIP | CAT_LOOSE,
      maskBits: LOOSE_MASK,
    });
  }
  b.setAwake(true);
}

/**
 * Takes a body out of the simulation where it stands — it just went off, and
 * what is left is particles. Deactivated rather than destroyed because every
 * point, stick and pose in the world is addressed by index: removing one would
 * renumber the scene out from under everything holding an index into it, and
 * `reset()` has to be able to bring the chip back.
 */
export function vanish(world: World, point: number): void {
  const b = world.points[point].body;
  b.setLinearVelocity(new Vec2(0, 0));
  b.setAngularVelocity(0);
  b.setActive(false);
}

/** Restores every body to its post-warm-start transform and re-welds the chips
 *  that were snapped off. */
export function reset(world: World): void {
  release(world);
  const damp = dampingCoeff(world.damping);
  world.bodies.forEach((b, i) => {
    const r = world.rest[i];
    if (!r) return;
    b.setActive(true); // a chip that went off is back with the rest of them
    if (b.isDynamic()) {
      b.setGravityScale(1); // undo a launch's inverted gravity
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
