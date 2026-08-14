import resume from '@/data/resume.json';
import logoSlugs from '@/data/tech-logos.json';

import {
  addBoxBody,
  addDisc,
  addNode,
  createWorld,
  link,
  type Strand,
  warmStart,
  weld,
  type World,
} from './physics';

// ---------------------------------------------------------------------------
// Palette (option 2a — "Hanging chain")
// ---------------------------------------------------------------------------
export const palette = {
  bg: '#100e0b',
  panelGradient:
    'linear-gradient(90deg,#100e0b 0%,#100e0b 82%,rgba(16,14,11,0) 100%)',
  text: '#ece7dd',
  amber: '#e0a458',
  ballBg: '#16130f',
  cardBg: '#1c1813',
  cardBorder: 'rgba(236,231,221,.16)',
  hairline: 'rgba(236,231,221,.12)',
} as const;

// Width of the fixed identity panel; the chain / nav live to the right of it.
export const PANEL_W = 440;
export const CARD_W = 260;

// Mobile chrome heights: the fixed top header (ilia.to + CTAs) and the bottom
// accordion nav bar. Used to pad the scroller and to centre boxes on nav.
// Two rows at 10px padding and an 8px gap: the CTA pair (~36px with the outline
// button's border) over the socials line (~18px). 84 leaves a few px of slack
// for font metrics — the header has a fixed height, so content that outgrows it
// would spill past the hairline rather than push it down.
export const MOBILE_HEADER_H = 84;
export const MOBILE_NAV_H = 72;

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
export interface Skill {
  label: string;
}

// Every technology the doc lists under TECHNICAL SKILLS, in doc order and
// de-duplicated across categories (Jest and Playwright appear twice).
export const SKILLS: Skill[] = resume.skills
  .flatMap((group) => group.items)
  .filter((label, i, all) => all.indexOf(label) === i)
  .map((label) => ({ label }));

export interface Experience {
  id: string;
  company: string;
  period: string;
  periodRaw: string; // "08/2023 – 02/2026" — drives <time dateTime>
  role: string;
  short: string; // one-liner shown on the hanging card
  blurb: string; // full copy shown in the accordion
  location: string;
  url: string | null; // the employer's site, when the doc names one
}

// Ordered most-recent → oldest (drives left → right placement on the chain).
export const EXPERIENCE: Experience[] = resume.experience.map((e) => ({
  id: e.id,
  company: e.company,
  period: e.period,
  periodRaw: e.periodRaw,
  role: e.role,
  short: e.short,
  blurb: e.blurb,
  location: e.location,
  url: e.url,
}));

export const EDUCATION = resume.education;

/** Identity facts the static resume prints verbatim. */
export const PROFILE = {
  name: resume.name,
  title: resume.title,
  location: resume.location,
  email: resume.contacts.email,
} as const;

export interface ChipDef {
  label: string;
  card: number; // index into EXPERIENCE
}

// Tech tags attached to each experience card, from each job's "Tech:" line.
export const CHIPS: ChipDef[] = resume.experience.flatMap((e, card) =>
  e.tech.map((label) => ({ label, card })),
);

// Maps a tech label to a Simple Icons logo saved under /public/logos.
const LOGO_SLUG: Record<string, string> = logoSlugs;

export function techLogo(label: string): string | null {
  const slug = LOGO_SLUG[label];
  return slug ? `/logos/${slug}.svg` : null;
}

/**
 * A technology with no logo rides as text, and there is only room for a few
 * characters of it (`StackBallDisc` abbreviates, a chip is a 40px disc). The
 * short names survive that — "SQL", "Vite", "MCP" — while the long ones come
 * out as "migr" and "Dock", which name nothing. So a label too long to read is
 * left out of the scene rather than rendered as a stub.
 *
 * **This hides a disc, not a skill.** `SKILLS` and `CHIPS` stay whole: the
 * static resume prints every one in full, and so do `/llms.txt` and the JSON-LD
 * (which read `resume.json` directly). The rule is about what fits in a circle.
 *
 * A chip gets one more character than a disc because it carries no logo more
 * often and sits on a card, where a slightly wider label still reads.
 */
const DISC_LABEL_MAX = 4;
const CHIP_LABEL_MAX = 5;

function legible(label: string, max: number): boolean {
  return techLogo(label) !== null || label.length <= max;
}

/** The technologies the stack ball can show as a logo or a readable word. */
export const BALL_SKILLS: Skill[] = SKILLS.filter((s) =>
  legible(s.label, DISC_LABEL_MAX),
);

/** Infers a display label for the doc's bare contact URLs. */
function socialLabel(href: string): string | null {
  if (href.includes('github.com')) return 'GitHub';
  if (href.includes('linkedin.com')) return 'LinkedIn';
  return null; // ilia.to itself — no point linking the site to itself
}

export const SOCIALS: { label: string; href: string }[] = [
  ...resume.contacts.links
    .map((href) => ({ label: socialLabel(href), href }))
    .filter((s): s is { label: string; href: string } => s.label !== null),
  { label: 'Email', href: `mailto:${resume.contacts.email}` },
];

export const INTRO = resume.summary;

// ---------------------------------------------------------------------------
// Scene assembly.
//   • one horizontal row: "stack" ball first, then experience newest → oldest
//   • non-uniform spacing between items
//   • each card is one rigid body hanging off a jointed rope; chips are welded
//     to its border and snap off (fall) on click
// ---------------------------------------------------------------------------
export interface TechBallView {
  id: string;
  labels: string[];
  r: number;
  point: number;
}

export interface CardView {
  id: string;
  exp: Experience;
  point: number; // Pv — the point on the top edge where the rope attaches
  bl: number; // bottom-left corner
  br: number; // bottom-right corner
  attach: number; // rope attach position as a fraction across the top (0=left)
}

export interface ChipView {
  id: string;
  label: string;
  point: number; // chip body centre
  sticks: number[]; // the welds; break them all to detach the chip
  cardPoint: number; // Pv
  cardBL: number;
  cardBR: number;
  bx: number; // border attach point, card-local (relative to Pv, untilted)
  by: number;
}

export interface Scene {
  world: World;
  techBall: TechBallView;
  cards: CardView[];
  chips: ChipView[];
  ropeSticks: number[]; // rope segments to draw
  strands: Strand[]; // ball first, then one per card — see `lean` / `payOut`
  itemsX: number[]; // centre x of each item, for prev/next nav
}

// The ceiling every desktop strand is pinned to. Exported because pulling the
// chain off plumb (see `lean`) is a shear about this line.
export const ANCHOR_Y = 16;

const FIRST_X = 760;
const GAPS = [430, 520, 400, 560, 470]; // non-uniform spacing between items
const RIGHT_MARGIN = 380; // floor; widened per-viewport so the last card can centre
const TECH_R = 136; // sized for the full skills list from the doc (~30 discs)

// Slack on top of a load's own reach above its rope end, so a drop-in starts it
// clear of the frame rather than flush with the top of it (see `Strand.clear`).
// Enough to cover a card's drop shadow and any slop in the height estimate.
const DROP_CLEAR = 60;

// Masses are relative and unitless — only their ratios matter. A rope node is
// light next to what it carries, so the ropes hang taut rather than flailing.
const ROPE_MASS = 1;
const BALL_MASS = 8;
const CARD_MASS = 2; // × the card's height factor, see below

// A card may swing, but never past this tilt — the rope hinge is limited, so no
// amount of flinging can turn a card over and leave its text upside-down.
const CARD_TILT = (60 * Math.PI) / 180;
const BOX_TILT = (48 * Math.PI) / 180; // tighter on mobile: a serial strand

// Deterministic pseudo-random (stable across SSR/CSR) for weights + scatter.
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

// Rough rendered height of a card, so text-heavy cards can hang higher.
function estimateCardHeight(blurb: string): number {
  const charsPerLine = 30; // ~260px wide at 12.5px
  const lines = Math.ceil(blurb.length / charsPerLine);
  return 78 /* header + role + padding */ + lines * 19;
}

export function buildScene(vh: number, vw: number): Scene {
  const anchorY = ANCHOR_Y;
  const cards: CardView[] = [];
  const cardHeights: number[] = [];
  const cardMasses: number[] = [];
  const chips: ChipView[] = [];
  const ropeSticks: number[] = [];
  const itemsX: number[] = [];
  // One record per anchor, for the drop-in that leans the chain and pays the
  // ropes out (see `lean` / `payOut`). Every body a strand carries goes in
  // `bodies`, welded chips included.
  const strands: Strand[] = [];
  const cardStrands: Strand[] = []; // the same objects, indexed by card

  // item x positions (non-uniform)
  const xs = [FIRST_X];
  for (let i = 0; i < EXPERIENCE.length; i++)
    xs.push(xs[i] + GAPS[i % GAPS.length]);
  // The nav centres a card at PANEL_W + (vw - PANEL_W) / 2; to reach that for the
  // last card the world must extend at least (vw - PANEL_W) / 2 past it, else it
  // can never scroll to centre and its accordion never shows. Add slack.
  const rightMargin = Math.max(RIGHT_MARGIN, (vw - PANEL_W) / 2 + 40);
  const worldW = xs[xs.length - 1] + rightMargin;

  const world = createWorld({
    w: worldW,
    h: vh,
    gravity: 2800, // things fall briskly; a slow drop reads as syrup
    damping: 0.93, // swing decays without a bounce-back
    floor: 10, // = scrollbar height, so snapped discs rest right on top of it
    // Each card hangs on its own rope, carrying only itself, so the ropes can
    // afford some give: stiff enough that a card at rest hangs where it was laid
    // out (~8px of stretch), soft enough that a drag pulls it roughly twice as
    // far as the rope is long before the stretch cap goes taut — and critically
    // damped, so it returns without a single bounce.
    ropeHz: 24,
  });

  // --- stack ball (leftmost) : 12-link chain -------------------------------
  const tbX = xs[0];
  // 2x the card rope length (ball diameter stands in for card height)
  const tbBase = Math.max(110, Math.min(360, vh - 120 - 2 * TECH_R - anchorY));
  const tbDepth = Math.max(60, tbBase + (rand(99) - 0.5) * 200); // ±100px jitter
  const TB_SEG = 12;
  // Bodies land in `world.bodies` in creation order, so the one just added is
  // always the last — that index is how a strand names what it carries.
  const lastBody = () => world.bodies.length - 1;
  const tbStrand: Strand = {
    rope: tbDepth,
    // The rope ends at the ball's *centre*, so the ball reaches a radius below
    // its own rope end — that is what has to clear the top of the stage.
    clear: anchorY + TECH_R + DROP_CLEAR,
    anchor: -1,
    load: -1,
    nodes: [],
    bodies: [],
  };
  strands.push(tbStrand);
  let tbPrev = addDisc(world, {
    x: tbX,
    y: anchorY,
    r: 3,
    mass: 0,
    pinned: true,
  }).point;
  tbStrand.anchor = lastBody();
  for (let s = 1; s < TB_SEG; s++) {
    const node = addDisc(world, {
      x: tbX,
      y: anchorY + (tbDepth * s) / TB_SEG,
      r: 3,
      mass: ROPE_MASS,
      rotates: false, // a rope node is a point mass; its spin means nothing
    });
    tbStrand.nodes.push(lastBody());
    tbStrand.bodies.push(lastBody());
    ropeSticks.push(link(world, tbPrev, node.point));
    tbPrev = node.point;
  }
  // The rope ends at the ball's centre, so the ball hangs plumb and does not
  // spin — the logo discs inside it run their own little sim.
  const ball = addDisc(world, {
    x: tbX,
    y: anchorY + tbDepth,
    r: TECH_R,
    mass: BALL_MASS,
    rotates: false,
    collides: true, // it shoulders the cards, same as they shoulder each other
  });
  tbStrand.bodies.push(lastBody());
  tbStrand.load = ball.point; // the rope ends on the ball's centre
  ropeSticks.push(link(world, tbPrev, ball.point));
  const techBall: TechBallView = {
    id: 'techball',
    labels: BALL_SKILLS.map((s) => s.label),
    r: TECH_R,
    point: ball.point,
  };
  itemsX.push(tbX);

  // --- experience cards : one rigid box on a 9-link chain -------------------
  EXPERIENCE.forEach((exp, i) => {
    const cx = xs[i + 1];
    const cardH = estimateCardHeight(exp.short);
    cardHeights.push(cardH);
    // Longer cards hang higher so their bottom stays clear of the nav row.
    const base = Math.max(110, Math.min(360, vh - 120 - cardH - anchorY)) / 2;
    const depth = Math.max(60, base + (rand(i * 8.3 + 11) - 0.5) * 200); // ±100px jitter
    // Bigger card → heavier → more inertia; slight random jitter.
    const mass = CARD_MASS * (cardH / 230) * (0.9 + rand(i * 3.7 + 2) * 0.3);
    cardMasses.push(mass);
    // the rope meets the card at a jittered point across the top (±15% of the
    // width from centre) instead of always dead-centre.
    const f = 0.5 + (rand(i * 4.9 + 7) - 0.5) * 0.3; // 0.35 – 0.65
    const SEG = 9;
    const strand: Strand = {
      rope: depth,
      // A card hangs *below* the point its rope meets, so its whole height has
      // to be above the stage before it counts as out of frame.
      clear: anchorY + cardH + DROP_CLEAR,
      anchor: -1,
      load: -1,
      nodes: [],
      bodies: [],
    };
    strands.push(strand);
    cardStrands.push(strand);
    let prev = addDisc(world, {
      x: cx,
      y: anchorY,
      r: 4,
      mass: 0,
      pinned: true,
    }).point;
    strand.anchor = lastBody();
    // The rope runs all the way down to the attach point — its last node sits
    // exactly on Pv, and the card hinges off that node with no offset. That is
    // what lets the bottom link swing like every other one: an offset anchor on
    // a fixed-rotation rope node can never turn, which would weld the last
    // segment upright.
    for (let s = 1; s <= SEG; s++) {
      const node = addDisc(world, {
        x: cx,
        y: anchorY + (depth * s) / SEG,
        r: 4,
        mass: ROPE_MASS,
        rotates: false,
      });
      strand.nodes.push(lastBody());
      strand.bodies.push(lastBody());
      ropeSticks.push(link(world, prev, node.point));
      prev = node.point;
    }
    // The card itself: a real rotating box. Its centre sits off to one side of
    // the rope because the rope attaches at fraction f across the top — which is
    // exactly what gives it something to tilt about.
    const pvY = anchorY + depth;
    const body = addBoxBody(world, {
      x: cx + (0.5 - f) * CARD_W,
      y: pvY + cardH / 2,
      w: CARD_W,
      h: cardH,
      mass,
      collides: true, // cards shoulder each other when dragged together
    });
    strand.bodies.push(lastBody());
    const pv = addNode(world, body, cx, pvY, 4);
    strand.load = pv; // the rope meets the card here, not at its centre
    const bl = addNode(world, body, cx - f * CARD_W, pvY + cardH, 4);
    const br = addNode(world, body, cx + (1 - f) * CARD_W, pvY + cardH, 4);
    link(world, prev, pv, CARD_TILT); // zero-length hinge — nothing to draw
    cards.push({ id: `card-${i}`, exp, point: pv, bl, br, attach: f });
    itemsX.push(cx);
  });

  // --- chips: weighted discs welded to each card's border -------------------
  // Placement along the border is random, but the per-chip masses are solved so
  // the net torque about the rope anchor is zero → every card hangs level at
  // rest. Snapping a chip off destroys its weld, so the balance genuinely
  // changes and the card tilts toward the weight that remains; the heavier /
  // further the removed chip, the bigger the swing.
  const STRUT_MIN = 26; // rod long enough the disc (r=20) fully clears the border
  const STRUT_MAX = 44;
  const TOP_MARGIN = 48; // keep chips off the top edge (the rope)
  const CORNER = 40; // keep chips off the rounded corners
  const byCard: number[][] = cards.map(() => []);
  CHIPS.forEach((ch, gi) => {
    if (legible(ch.label, CHIP_LABEL_MAX)) byCard[ch.card].push(gi);
  });
  byCard.forEach((list, ci) => {
    const card = cards[ci];
    const pv = world.points[card.point];
    const cardH = cardHeights[ci];
    const f = card.attach;
    const hwL = f * CARD_W; // pivot → left edge
    const hwR = (1 - f) * CARD_W; // pivot → right edge
    // keep chips off the rounded corners: usable spans are inset by CORNER.
    const segL = cardH - CORNER - TOP_MARGIN; // left edge (below the top, above the corner)
    const segB = CARD_W - 2 * CORNER; // bottom edge (between the corners)
    const total = segL + segB + segL; // left + bottom + right
    const k = list.length;
    // 1) place each chip (even slot + bounded jitter → spread, never overlaps)
    //    and give it a provisional random mass.
    const placed = list.map((gi, j) => {
      const frac = (j + 0.5) / k + (rand(gi * 2.3 + 1) - 0.5) * (0.5 / k);
      const d = Math.max(0, Math.min(total, frac * total));
      let bx: number;
      let by: number;
      let nx: number;
      let ny: number;
      if (d < segL) {
        bx = -hwL;
        by = TOP_MARGIN + d;
        nx = -1;
        ny = 0;
      } else if (d < segL + segB) {
        bx = -hwL + CORNER + (d - segL);
        by = cardH;
        nx = 0;
        ny = 1;
      } else {
        bx = hwR;
        by = TOP_MARGIN + (d - segL - segB);
        nx = 1;
        ny = 0;
      }
      const strut = STRUT_MIN + rand(gi * 7.1 + 9) * (STRUT_MAX - STRUT_MIN);
      const dx = bx + nx * strut; // horizontal lever arm from the pivot (pv)
      const w = 0.7 + rand(gi * 5.3 + 4) * 0.9; // varied weight, ~[0.7, 1.6]
      return { gi, bx, by, nx, ny, strut, dx, w };
    });
    // 2) null the net torque so the card starts balanced. Because the pivot is
    //    off-centre, the card's own weight contributes a base torque too; the
    //    chips must cancel that as well as each other. The minimal nudge
    //    w_i -= λ·dx_i with λ = (Σ(w·dx) + T_card) / Σ(dx²) zeroes the total.
    const tCard = cardMasses[ci] * (0.5 - f) * CARD_W;
    const D = placed.reduce((s, p) => s + p.dx * p.dx, 0);
    if (D > 0) {
      const lambda = (placed.reduce((s, p) => s + p.w * p.dx, 0) + tCard) / D;
      for (const p of placed) p.w = Math.max(0.4, p.w - lambda * p.dx);
    }
    // 3) commit the discs and weld each to the card.
    for (const p of placed) {
      const chip = addDisc(world, {
        x: pv.x + p.bx + p.nx * p.strut,
        y: pv.y + p.by + p.ny * p.strut,
        r: 20,
        mass: p.w,
        collides: false, // starts welded; picks up contacts once it snaps off
      });
      cardStrands[ci].bodies.push(lastBody()); // leans with the card it is on
      const s1 = weld(world, card.point, chip.point, pv.x + p.bx, pv.y + p.by);
      chips.push({
        id: `chip-${p.gi}`,
        label: CHIPS[p.gi].label,
        point: chip.point,
        sticks: [s1],
        cardPoint: card.point,
        cardBL: card.bl,
        cardBR: card.br,
        bx: p.bx,
        by: p.by,
      });
    }
  });

  // Warm start: settle the hanging bodies to equilibrium up front so the scene
  // appears already at rest and can fade in fast, instead of visibly swinging
  // into place on load. Also snapshots the rest pose that `reset()` restores.
  warmStart(world, 220);

  return { world, techBall, cards, chips, ropeSticks, strands, itemsX };
}

// ---------------------------------------------------------------------------
// Mobile scene: one vertical strand. The logo circle is fixed at the top
// (pinned — it does not swing on a rope); a rope drops from its bottom to the
// first box, and every box's bottom-centre anchors the rope down to the next
// box. So each rope is linked to the box above it — a single hanging chain.
// ---------------------------------------------------------------------------
export interface MobileBoxView {
  id: string;
  exp: Experience;
  index: number; // EXPERIENCE index (tap-to-open target)
  point: number; // Pv — rope-in attach on the top edge (centre)
  bl: number; // bottom-left corner
  br: number; // bottom-right corner
  bc: number; // bottom-centre — rope-out anchor to the next box
  height: number; // fixed render height so the DOM box matches the physics body
  attach: number; // rope attach fraction across the top — always 0.5 on mobile
}

export interface MobileScene {
  world: World;
  techBall: TechBallView;
  boxes: MobileBoxView[];
  chips: ChipView[]; // tech logos bolted to the box borders (snappable)
  ropeSticks: number[];
  cardW: number; // shared box width
  itemsY: number[]; // centre y of each box, for the bottom-accordion nav
}

const MB_TOP = 28; // gap above the circle
const MB_SEG = 5; // rope segments between bodies
const MB_SEG_LEN = 26; // px per rope segment
const MB_CHIP_STRUT_MIN = 22;
const MB_CHIP_STRUT_MAX = 34;
const MB_CHIP_TOP = 44; // keep chips below the top edge (clear of the rope)
const MB_CHIP_CORNER = 30; // keep chips off the rounded corners
const MB_CHIP_R = 20;
const MB_CHIP_SLOT = 46; // vertical space reserved per chip on an edge
const BOX_MASS = 3.4; // heavy → more inertia, calmer sway
/**
 * Rope nodes here are 8x the desktop's ROPE_MASS, and that is what makes the
 * strand settle at all. Desktop ropes carry one card each; this one is serial,
 * so its top node carries every box, chip and node below it — ~60 mass units
 * against a node of 1. Box2D's sequential-impulse solver cannot hold a ratio
 * that wide: the light node between a pinned anchor and the whole strand gets
 * thrown around, and the scene never drops under the sleep tolerance, so it
 * jitters at ~1px forever and pays full solver cost doing it. The top node was
 * the fastest body in the scene in 421 of 482 frames, peaking at 124 px/s on a
 * strand nobody had touched.
 *
 * Measured on the built scene, shoving one box sideways and waiting for the
 * whole world to sleep: 1, 2 and 4 never sleep at all (>15s, residual 5+ px/s);
 * 8 sleeps in ~0.4s; 12 and 20 sleep but take 1.7s and 2.7s, since a heavier
 * rope carries more of its own momentum. 8 is both the floor and the fastest.
 *
 * This is the "within about an order of magnitude of what it carries" rule a
 * few lines up, and it is a floor, not a preference — no amount of damping
 * substitutes for it, because the solver re-injects the energy every step.
 */
const MB_ROPE_MASS = 8;

// Minimum box height from the short blurb; grown further if the chips on one
// side need more vertical room. Fixed height so the physics bottom-centre lines
// up with the rendered box (an outgoing rope hangs from it).
function mobileCardHeight(short: string, cardW: number): number {
  const charsPerLine = Math.max(20, Math.floor((cardW - 40) / 6.6));
  const lines = Math.ceil(short.length / charsPerLine);
  return 96 + lines * 19; // company + role + period + padding, then body lines
}

// Chips ride short struts off the box's LEFT and RIGHT edges only (the bottom
// edge is left clear for the outgoing rope). Masses are solved so the net torque
// about the rope anchor is zero → the box hangs level at rest, and snapping a
// chip off unbalances it so the box tilts. Mirrors the desktop satellite maths,
// minus the bottom run.
function attachMobileChips(
  world: World,
  box: MobileBoxView,
  cardW: number,
  cardH: number,
  chipList: number[], // global CHIPS indices for this box
): ChipView[] {
  const pv = world.points[box.point];
  const f = box.attach;
  const hwL = f * cardW; // pivot → left edge
  const hwR = (1 - f) * cardW; // pivot → right edge
  const seg = cardH - MB_CHIP_CORNER - MB_CHIP_TOP; // usable vertical edge span
  const k = chipList.length;
  const leftCount = Math.ceil(k / 2);
  // 1) place each chip on a side with even slotting + bounded jitter
  const placed = chipList.map((gi, j) => {
    const left = j < leftCount;
    const idxOnSide = left ? j : j - leftCount;
    const countOnSide = Math.max(1, left ? leftCount : k - leftCount);
    const frac =
      (idxOnSide + 0.5) / countOnSide +
      (rand(gi * 2.3 + 1) - 0.5) * (0.4 / countOnSide);
    const by = MB_CHIP_TOP + Math.max(0, Math.min(seg, frac * seg));
    const bx = left ? -hwL : hwR;
    const nx = left ? -1 : 1;
    const strut =
      MB_CHIP_STRUT_MIN +
      rand(gi * 7.1 + 9) * (MB_CHIP_STRUT_MAX - MB_CHIP_STRUT_MIN);
    const dx = bx + nx * strut; // horizontal lever arm from the pivot
    const w = 0.7 + rand(gi * 5.3 + 4) * 0.9;
    return { gi, bx, by, nx, strut, dx, w };
  });
  // 2) null the net torque so it hangs level. The rope attaches dead-centre on
  //    mobile, so the box's own weight pulls straight down through the pivot and
  //    the chips only have to cancel each other.
  const D = placed.reduce((s, p) => s + p.dx * p.dx, 0);
  if (D > 0) {
    const lambda = placed.reduce((s, p) => s + p.w * p.dx, 0) / D;
    for (const p of placed) p.w = Math.max(0.4, p.w - lambda * p.dx);
  }
  // 3) commit the discs and weld each to the box
  const out: ChipView[] = [];
  for (const p of placed) {
    const chip = addDisc(world, {
      x: pv.x + p.bx + p.nx * p.strut,
      y: pv.y + p.by,
      r: MB_CHIP_R,
      mass: p.w,
      collides: false,
    });
    const s1 = weld(world, box.point, chip.point, pv.x + p.bx, pv.y + p.by);
    out.push({
      id: `mchip-${p.gi}`,
      label: CHIPS[p.gi].label,
      point: chip.point,
      sticks: [s1],
      cardPoint: box.point,
      cardBL: box.bl,
      cardBR: box.br,
      bx: p.bx,
      by: p.by,
    });
  }
  return out;
}

export function buildMobileScene(vw: number): MobileScene {
  const cx = Math.round(vw / 2);
  // Leave side room for the chips + their struts so they clear the walls.
  const cardW = Math.max(188, Math.min(272, vw - 132));
  const ballR = Math.min(104, Math.round((vw - 96) / 2));

  const ropeSticks: number[] = [];
  const boxes: MobileBoxView[] = [];
  const chips: ChipView[] = [];
  const itemsY: number[] = [];

  // group the tech chips by experience (same mapping the desktop uses)
  const byBox: number[][] = EXPERIENCE.map(() => []);
  CHIPS.forEach((ch, gi) => {
    if (legible(ch.label, CHIP_LABEL_MAX)) byBox[ch.card].push(gi);
  });

  // The strand's height is only known once every box is laid out, and the world
  // needs it up front for the ground plane — so measure the run first.
  const circleCY = MB_TOP + ballR;
  const heights = EXPERIENCE.map((exp, i) => {
    const perSide = Math.ceil(byBox[i].length / 2);
    const chipNeed = perSide * MB_CHIP_SLOT + MB_CHIP_TOP + MB_CHIP_CORNER;
    return Math.max(mobileCardHeight(exp.short, cardW), chipNeed);
  });
  const worldH =
    circleCY +
    ballR +
    heights.reduce((s, h) => s + h + MB_SEG * MB_SEG_LEN, 0) +
    120;

  const world = createWorld({
    w: vw,
    h: worldH,
    gravity: 2400,
    // Damped harder than the desktop's 0.93. There each card hangs on its own
    // rope and only has to lose its own energy; here one serial strand feeds
    // every box's swing into the boxes below it, so the same retention leaves
    // the rope drifting long after the scroll that started it. ~2x the drag.
    damping: 0.88,
    floor: 10,
    // Rigid here: this is one serial strand, so every rope also carries the
    // boxes below it and any give compounds — even at 24 Hz the last box ends up
    // 300px below the scroller and the strand takes 15s to stop. The boxes swing
    // plenty on rigid ropes anyway, now that every link articulates.
    ropeHz: 0,
  });

  // fixed circle (pinned centre) — logos inside still bounce, the circle doesn't
  const ballPoint = addDisc(world, {
    x: cx,
    y: circleCY,
    r: ballR,
    mass: 0,
    pinned: true,
  }).point;
  const techBall: TechBallView = {
    id: 'techball',
    labels: BALL_SKILLS.map((s) => s.label),
    r: ballR,
    point: ballPoint,
  };

  // pinned rope origin at the bottom of the fixed circle
  let prev = addDisc(world, {
    x: cx,
    y: circleCY + ballR,
    r: 3,
    mass: 0,
    pinned: true,
  }).point;
  let y = circleCY + ballR;

  EXPERIENCE.forEach((exp, i) => {
    const cardH = heights[i];

    // rope down to this box's top edge; its last node lands on the attach point
    // itself, so the bottom link swings like every other one
    for (let s = 1; s <= MB_SEG; s++) {
      y += MB_SEG_LEN;
      const node = addDisc(world, {
        x: cx,
        y,
        r: 4,
        mass: MB_ROPE_MASS,
        rotates: false,
      });
      ropeSticks.push(link(world, prev, node.point));
      prev = node.point;
    }
    const pvY = y;
    const body = addBoxBody(world, {
      x: cx,
      y: pvY + cardH / 2,
      w: cardW,
      h: cardH,
      mass: BOX_MASS,
      collides: true,
    });
    const pv = addNode(world, body, cx, pvY, 4);
    const bl = addNode(world, body, cx - cardW / 2, pvY + cardH, 4);
    const br = addNode(world, body, cx + cardW / 2, pvY + cardH, 4);
    const bc = addNode(world, body, cx, pvY + cardH, 4);
    link(world, prev, pv, BOX_TILT); // zero-length hinge — nothing to draw
    const box: MobileBoxView = {
      id: `mbox-${i}`,
      exp,
      index: i,
      point: pv,
      bl,
      br,
      bc,
      height: cardH,
      attach: 0.5,
    };
    boxes.push(box);
    for (const c of attachMobileChips(world, box, cardW, cardH, byBox[i]))
      chips.push(c);
    prev = bc; // next rope hangs from this box's bottom-centre
    y = pvY + cardH;
  });

  // Warm start: a straight vertical strand is already near equilibrium, so this
  // mainly tightens the ropes and balances the chips before the fade-in.
  warmStart(world, 320);

  for (const b of boxes) itemsY.push(world.points[b.point].y + b.height / 2);

  return { world, techBall, boxes, chips, ropeSticks, cardW, itemsY };
}
