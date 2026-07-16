import { type Point, step, type Stick, type World } from './physics';

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

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
export interface Skill {
  label: string;
}

export const SKILLS: Skill[] = [
  { label: 'React' },
  { label: 'React Native' },
  { label: 'Vue' },
  { label: 'TypeScript' },
  { label: 'JavaScript' },
  { label: 'Node' },
  { label: 'Next.js' },
  { label: 'NestJS' },
  { label: 'PostgreSQL' },
  { label: 'Stripe' },
  { label: 'Electron' },
  { label: 'Storybook' },
  { label: 'Playwright' },
];

export interface Experience {
  company: string;
  period: string;
  role: string;
  short: string; // one-liner shown on the hanging card
  blurb: string; // full copy shown in the accordion, drawn from ilia.to
}

// Ordered most-recent → oldest (drives left → right placement on the chain).
export const EXPERIENCE: Experience[] = [
  {
    company: 'Overtone Arr',
    period: '2026–now',
    role: 'Founder / Builder',
    short:
      'Full-stack art gallery & print-on-demand storefront — Next.js/NestJS, Stripe, AI + MCP, React Native app.',
    blurb:
      'Built a full-stack art gallery and print-on-demand storefront (Next.js, NestJS, PostgreSQL) with multi-provider Stripe payments and automated Prodigi/Printify fulfillment. Added deep AI integration — chat, an MCP server, and automated description generation via a two-stage LLM call. Shipped a companion mobile app in React Native.',
  },
  {
    company: 'CrossCountry Mortgage',
    period: '2023–2026',
    role: 'Senior Software Engineer',
    short:
      'Vue/TS platform for 3,500+ loan officers — 3× faster loads, Cube analytics UI, shared Storybook library.',
    blurb: `Top performer on the LoanOfficer One platform - an internal Vue/TypeScript system serving more than 3,500 loan officers nationwide at the #1 US retail mortgage company. I worked across multiple teams that consisted of product owners, API developers, CSS developers, a Scrum Master, and other UI developers. This project comprises hundreds of screens with weekly deployments.

• Discussed and enforced coding standards and architecture guidelines. Established comprehensive lint rules and code quality standards, reducing code-style inconsistencies and improving long-term maintainability across the codebase.
• Achieved a three-time improvement in application load time through performance profiling and optimization. Greatly improved table view performance by finding a weak spot and making a fix.
• Added full TypeScript coverage to the networking (API) subsystem, significantly reducing runtime errors caused by type mismatches, and improved AI adoption.
• Implemented optimistic, debounced network calls with request caching to cut redundant network traffic and improve responsiveness, which improved performance by at least one and a half times in some areas.
• Championed AI-assisted engineering workflows (Copilot with Claude, Codex), integrating automated code review, test generation, and documentation into the development process and improving delivery speed up to two times.
• Designed and implemented the frontend architecture for Cube, a configurable analytics interface for querying loan and user datasets - one of the platform's largest features.
• Extracted tens of shared components into the component library via Storybook (configurable table, column selector, drag-and-drop tree view), adopted across multiple company projects.
• Built end-to-end test coverage using the Playwright framework and unit tests using Jest.
• Partnered with tech support and backend teams to evaluate and resolve production incidents, reducing recurring UI errors and stabilizing critical workflows used by thousands of loan officers. Diagnosed and fixed UI defects, race conditions in parallel API call queues (e.g., Cube), and data inconsistencies by collaborating with product owners, QA, and tech support. Eliminated recurring race condition issues in Cube, including defects introduced by outsourced contributors.
• Partnered directly with business stakeholders to design and iterate the Loan Summary page, translating business requirements into UI implementation. Collaborated with API developers to define interface contracts for complex features like Cube.`,
  },
  {
    company: 'TrueCar',
    period: '2022–2023',
    role: 'Senior Software Engineer',
    short:
      'Dealer Portal web (React) + mobile (React Native), shipped to both app stores. Mentored, led reviews.',
    blurb: `Developed and maintained the Dealer Portal mobile app (React Native) and web application (React), delivering new features in collaboration with design and product teams.
Mentored a junior engineer on best practices and coding standards; led code reviews to maintain quality and consistency.
Built reusable UI components and shared logic to accelerate development across the project.
Published iOS and Android apps to their respective app stores; contributed to hiring by leading frontend interviews.`,
  },
  {
    company: 'Centralex',
    period: '2021-2022',
    role: 'Head of Frontend',
    short:
      'Frontend lead for a DeFi exchange + mobile app (React, Web3.js, Ionic). Built staking app, grew the team.',
    blurb: `Led frontend development of a decentralized finance Exchange platform and mobile app using React, TypeScript, Redux, Redux Sagas, and Ionic in a Yarn monorepo.
Built a Staking application with Web3.js and Solidity; developed the Next.js marketing site.
Designed the application architecture for scalability; managed and grew the frontend team through hiring and mentorship.
Led frontend architecture decisions in direct collaboration with designers, product managers, and non-technical stakeholders, owning the full UI vision from requirements through delivery.
`,
  },
  {
    company: 'Ankr',
    period: '2019–2021',
    role: 'Founding Senior Frontend Engineer',
    short:
      'Built the Ankr Portal from scratch — RN app, Electron wallet, explorer. Yarn monorepo + custom OAuth layer.',
    blurb: `Core team member who built the Ankr Portal from scratch - a platform for deploying web and crypto-app servers - using React and TypeScript.
Developed the Ankr Mobile app (React Native), Ankr Wallet (Electron), and blockchain explorer in a Yarn monorepo.
Proposed and implemented a Yarn monorepo architecture for cross-app code sharing; built a custom Axios/Redux-Sagas networking layer for seamless OAuth handling.
Drove UI architecture and product direction in close collaboration with designers and business leadership, translating stakeholder requirements into scalable frontend solutions.
`,
  },
  {
    company: 'LIX',
    period: '2018',
    role: 'React Native Engineer',
    short:
      'Multi-platform React Native book reader — Service Workers, concurrent downloads, 600+ lint fixes.',
    blurb: `Developed a multi-platform book reader app (iOS, macOS, Windows) for an EdTech startup.
Implemented Service Workers for a major performance boost; rewrote the book download subsystem with Redux Sagas to support concurrent downloads.
Set up E2E testing with Spectron; enforced ESLint standards and resolved 600+ code-style issues.
`,
  },
  {
    company: 'Earlier',
    period: '1999–2018',
    role: 'Full-stack & iOS Engineer',
    short:
      'Two decades full-stack & iOS across agencies and product cos — PHP, JavaScript, Flash, MySQL, EmberJS, Objective-C, HTML',
    blurb:
      'I spent a decade in full-stack and mobile development — building iOS apps, React Native projects, and web applications across agencies, product companies, and client services in both Russia and the US. That period included sole ownership of mobile clients, junior developer mentorship, and work across a wide range of stacks.',
  },
];

export interface ChipDef {
  label: string;
  card: number; // index into EXPERIENCE
}

// Tech tags attached to each experience card.
export const CHIPS: ChipDef[] = [
  { label: 'Next.js', card: 0 },
  { label: 'NestJS', card: 0 },
  { label: 'Stripe', card: 0 },
  { label: 'React Native', card: 0 },
  { label: 'Vue', card: 1 },
  { label: 'Playwright', card: 1 },
  { label: 'TypeScript', card: 1 },
  { label: 'Storybook', card: 1 },
  { label: 'React', card: 2 },
  { label: 'React Native', card: 2 },
  { label: 'React', card: 3 },
  { label: 'TypeScript', card: 3 },
  { label: 'React', card: 4 },
  { label: 'React Native', card: 4 },
  { label: 'Electron', card: 4 },
  { label: 'Monorepo', card: 4 },
  { label: 'React Native', card: 5 },
  { label: 'JavaScript', card: 5 },
  { label: 'JavaScript', card: 6 },
  { label: 'Node', card: 6 },
];

// Maps a tech label to a Simple Icons logo saved under /public/logos.
const LOGO_SLUG: Record<string, string> = {
  React: 'react',
  'React Native': 'react',
  Vue: 'vuedotjs',
  TypeScript: 'typescript',
  JavaScript: 'javascript',
  Node: 'nodedotjs',
  'Next.js': 'nextdotjs',
  NestJS: 'nestjs',
  PostgreSQL: 'postgresql',
  Stripe: 'stripe',
  Electron: 'electron',
  Storybook: 'storybook',
  Playwright: 'playwright',
  Monorepo: 'turborepo',
};

export function techLogo(label: string): string | null {
  const slug = LOGO_SLUG[label];
  return slug ? `/logos/${slug}.svg` : null;
}

export const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/starkyru' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/starkyru/' },
  { label: 'Email', href: 'mailto:starkyru@gmail.com' },
] as const;

export const INTRO =
  'I solve hard production problems across the whole stack — race conditions, 3× load-time wins, full Next.js + NestJS products built solo. React and React Native shipped at scale: a platform serving 3,500+ loan officers at the #1 US retail mortgage company, and mobile apps in both app stores.';

// ---------------------------------------------------------------------------
// Scene assembly.
//   • one horizontal row: "stack" ball first, then experience newest → oldest
//   • non-uniform spacing between items
//   • chips are satellites scattered around their card (pinned by the hook),
//     drawn on struts, and snap off (fall) on click
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
  bl: number; // bottom-left corner (rigid triangle with point + br)
  br: number; // bottom-right corner
  attach: number; // rope attach position as a fraction across the top (0=left)
}

export interface ChipView {
  id: string;
  label: string;
  point: number; // chip body — a weighted point rigidly linked into the card
  sticks: number[]; // the rigid links; break them all to detach the chip
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
  itemsX: number[]; // centre x of each item, for prev/next nav
  rest: Point[]; // snapshot for reset
}

const FIRST_X = 760;
const GAPS = [430, 520, 400, 560, 470]; // non-uniform spacing between items
const RIGHT_MARGIN = 380; // floor; widened per-viewport so the last card can centre
const TECH_R = 116;

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
  const points: Point[] = [];
  const sticks: Stick[] = [];

  const addPoint = (
    x: number,
    y: number,
    r: number,
    pinned = false,
    im = 1,
  ): number => {
    points.push({ x, y, px: x, py: y, r, im, pinned, held: false });
    return points.length - 1;
  };
  const addStick = (a: number, b: number, stiff = 1): number => {
    const A = points[a];
    const B = points[b];
    sticks.push({
      a,
      b,
      len: Math.hypot(B.x - A.x, B.y - A.y),
      stiff,
      broken: false,
    });
    return sticks.length - 1;
  };

  const anchorY = 16;
  const cards: CardView[] = [];
  const cardHeights: number[] = [];
  const cornerWs: number[] = []; // gravity weight of each card's two bottom corners
  const chips: ChipView[] = [];
  const ropeSticks: number[] = [];
  const itemsX: number[] = [];

  // item x positions (non-uniform)
  const xs = [FIRST_X];
  for (let i = 0; i < EXPERIENCE.length; i++)
    xs.push(xs[i] + GAPS[i % GAPS.length]);
  // The nav centres a card at PANEL_W + (vw - PANEL_W) / 2; to reach that for the
  // last card the world must extend at least (vw - PANEL_W) / 2 past it, else it
  // can never scroll to centre and its accordion never shows. Add slack.
  const rightMargin = Math.max(RIGHT_MARGIN, (vw - PANEL_W) / 2 + 40);
  const worldW = xs[xs.length - 1] + rightMargin;

  // --- stack ball (leftmost) : 8-link chain --------------------------------
  const tbX = xs[0];
  // 2x the card rope length (ball diameter stands in for card height)
  const tbBase = Math.max(110, Math.min(360, vh - 120 - 2 * TECH_R - anchorY));
  const tbDepth = Math.max(60, tbBase + (rand(99) - 0.5) * 200); // ±100px jitter
  let tbPrev = addPoint(tbX, anchorY, 3, true);
  for (let s = 1; s <= 8; s++) {
    const t = s / 8;
    const isEnd = s === 8;
    // the ball is the heaviest hanging body → lots of inertia
    const im = isEnd ? 1 / 3.4 : 1;
    const idx = addPoint(
      tbX,
      anchorY + tbDepth * t,
      isEnd ? TECH_R : 3,
      false,
      im,
    );
    ropeSticks.push(addStick(tbPrev, idx, isEnd ? 0.96 : 0.9));
    tbPrev = idx;
  }
  const techBall: TechBallView = {
    id: 'techball',
    labels: SKILLS.map((s) => s.label),
    r: TECH_R,
    point: tbPrev,
  };
  itemsX.push(tbX);

  // --- experience cards : rigid triangle (Pv + BL + BR) on a 6-link chain ---
  EXPERIENCE.forEach((exp, i) => {
    const cx = xs[i + 1];
    const cardH = estimateCardHeight(exp.short);
    cardHeights.push(cardH);
    // Longer cards hang higher so their bottom stays clear of the nav row.
    const base = Math.max(110, Math.min(360, vh - 120 - cardH - anchorY)) / 2;
    const depth = Math.max(60, base + (rand(i * 8.3 + 11) - 0.5) * 200); // ±100px jitter
    // Corner mass — bigger card → heavier → more inertia; slight random jitter.
    const cim = 1 / ((cardH / 230) * (0.9 + rand(i * 3.7 + 2) * 0.3));
    cornerWs.push(1 / cim);
    // the rope meets the card at a jittered point across the top (±15% of the
    // width from centre) instead of always dead-centre.
    const f = 0.5 + (rand(i * 4.9 + 7) - 0.5) * 0.3; // 0.35 – 0.65
    let prev = addPoint(cx, anchorY, 4, true);
    for (let s = 1; s <= 6; s++) {
      const t = s / 6;
      const isEnd = s === 6;
      const idx = addPoint(cx, anchorY + depth * t, 4, false, isEnd ? cim : 1);
      ropeSticks.push(addStick(prev, idx, 0.95));
      prev = idx;
    }
    const pv = prev; // rope end → sits on the card's top edge at fraction f
    const pvY = points[pv].y;
    const bl = addPoint(cx - f * CARD_W, pvY + cardH, 4, false, cim);
    const br = addPoint(cx + (1 - f) * CARD_W, pvY + cardH, 4, false, cim);
    // rigid triangle (not drawn) — gives the card an orientation that responds
    // to the torque of whatever weight is attached to it
    addStick(pv, bl, 1);
    addStick(pv, br, 1);
    addStick(bl, br, 1);
    cards.push({ id: `card-${i}`, exp, point: pv, bl, br, attach: f });
    itemsX.push(cx);
  });

  // --- chips: weighted discs on short rigid rods off each card's border -----
  // Each chip is linked to all three card corners → it moves exactly with the
  // card (a rigid weld) until snapped. Placement along the border is random but
  // the per-chip weights are solved so the net torque about the rope anchor is
  // zero → every card hangs level at rest. Snapping a chip off breaks that
  // balance, so the card tilts toward the weight that remains; the heavier /
  // further the removed chip, the bigger the swing.
  const STRUT_MIN = 26; // rod long enough the disc (r=20) fully clears the border
  const STRUT_MAX = 44;
  const TOP_MARGIN = 48; // keep chips off the top edge (the rope)
  const CORNER = 40; // keep chips off the rounded corners
  const byCard: number[][] = cards.map(() => []);
  CHIPS.forEach((ch, gi) => byCard[ch.card].push(gi));
  byCard.forEach((list, ci) => {
    const card = cards[ci];
    const pv = points[card.point];
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
    //    and give it a provisional random weight.
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
    //    off-centre, the two bottom corners contribute a base torque too; the
    //    chips must cancel that as well as each other. The minimal nudge
    //    w_i -= λ·dx_i with λ = (Σ(w·dx) + T_corner) / Σ(dx²) zeroes the total.
    const bl = points[card.bl];
    const br = points[card.br];
    const tCorner = cornerWs[ci] * (bl.x - pv.x + (br.x - pv.x));
    const D = placed.reduce((s, p) => s + p.dx * p.dx, 0);
    if (D > 0) {
      const lambda = (placed.reduce((s, p) => s + p.w * p.dx, 0) + tCorner) / D;
      for (const p of placed) p.w = Math.max(0.4, p.w - lambda * p.dx);
    }
    // 3) commit weighted points + the three rigid links per chip.
    for (const p of placed) {
      const chip = addPoint(
        pv.x + p.bx + p.nx * p.strut,
        pv.y + p.by + p.ny * p.strut,
        20,
        false,
        1 / p.w,
      );
      const s1 = addStick(card.point, chip, 1);
      const s2 = addStick(card.bl, chip, 1);
      const s3 = addStick(card.br, chip, 1);
      chips.push({
        id: `chip-${p.gi}`,
        label: CHIPS[p.gi].label,
        point: chip,
        sticks: [s1, s2, s3],
        cardPoint: card.point,
        cardBL: card.bl,
        cardBR: card.br,
        bx: p.bx,
        by: p.by,
      });
    }
  });

  const world: World = {
    points,
    sticks,
    w: worldW,
    h: vh,
    gravity: 1400,
    damping: 0.965,
    floor: 10, // = scrollbar height, so snapped discs rest right on top of it
  };

  // Warm start: settle the hanging bodies to equilibrium up front so the scene
  // appears already at rest and can fade in fast, instead of visibly swinging
  // into place on load.
  for (let i = 0; i < 220; i++) step(world, 12);

  const rest = points.map((p) => ({ ...p }));

  return { world, techBall, cards, chips, ropeSticks, itemsX, rest };
}
