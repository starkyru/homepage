import { RefObject, useCallback, useEffect, useRef } from 'react';

import type { Scene } from './model';
import { step } from './physics';

// Round transforms to 0.1px so a settled node produces an identical string
// frame-to-frame; we then skip rewriting it, which lets the browser's native
// `title` tooltip appear (constant style mutation keeps resetting its timer).
const r1 = (v: number) => Math.round(v * 10) / 10;

interface PositionedNode {
  el: HTMLElement;
  point: number;
  w: number;
  h: number;
  card: boolean;
  chip: boolean;
  id: string; // chip id (for the snapped check)
  cardPv: number; // the chip's card Pv, to inherit the card's angle
  af: number; // card attach fraction across the top (rotation pivot / origin)
  bl: number;
  br: number;
  lastT: string; // last transform written (skip identical writes)
}

/**
 * Drives the outer Verlet scene: the stack ball and experience cards hang from
 * a ceiling of anchors; tech chips are pinned as satellites around their card
 * each frame (rotating with its swing) until clicked, when they detach and
 * fall. One rAF loop mutates DOM transforms directly — no React re-render.
 * Inert while `active` is false (reduced-motion / small screens).
 */
export function useHangingChain(
  stageRef: RefObject<HTMLDivElement | null>,
  scene: Scene,
  active: boolean,
  onSettled?: () => void, // fired once the chain stops swinging (reveal cue)
) {
  const rafRef = useRef<number | null>(null);
  const snappedRef = useRef<Set<string>>(new Set());
  // kept in a ref so a changing callback identity doesn't restart the sim
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const reset = useCallback(() => {
    const { world, rest } = scene;
    for (let i = 0; i < world.points.length; i++) {
      const p = world.points[i];
      const r = rest[i];
      p.x = r.x;
      p.y = r.y;
      p.px = r.x;
      p.py = r.y;
      p.held = false;
    }
    for (const s of world.sticks) s.broken = false;
    snappedRef.current.clear();
  }, [scene]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !active) return;

    const { world } = scene;
    const snapped = snappedRef.current;
    const chipSticksById = new Map<string, number[]>();
    for (const c of scene.chips) chipSticksById.set(c.id, c.sticks);

    const nodes: PositionedNode[] = [];
    stage.querySelectorAll<HTMLElement>('[data-point]').forEach((el) => {
      nodes.push({
        el,
        point: Number(el.dataset.point),
        w: el.offsetWidth,
        h: el.offsetHeight,
        card: el.dataset.kind === 'card',
        chip: el.dataset.kind === 'chip',
        id: el.dataset.snap ?? '',
        cardPv: Number(el.dataset.cpv ?? -1),
        af: Number(el.dataset.af ?? 0.5),
        bl: Number(el.dataset.bl ?? -1),
        br: Number(el.dataset.br ?? -1),
        lastT: '',
      });
    });
    const ropeLines = Array.from(
      stage.querySelectorAll<SVGLineElement>('line[data-stick]'),
    );
    const strutLines = Array.from(
      stage.querySelectorAll<SVGLineElement>('line[data-strut]'),
    );

    // per-card live frame: pivot Pv (rope attach), unit right axis (bottom edge)
    // + its perpendicular (down), the card's u-extents about the pivot, and angle
    interface CardFrame {
      x: number; // pivot (rope attach point) in stage coords
      y: number;
      rx: number; // unit "right" axis = normalized (BR - BL)
      ry: number;
      nx: number; // unit "down" axis = right rotated +90°
      ny: number;
      uL: number; // left edge offset along right (≤ 0)
      uR: number; // right edge offset along right (≥ 0)
      h: number; // real rendered card height
      deg: number; // card rotation = bottom-edge angle (0 when level)
    }

    const render = () => {
      // pass 1 — cards: rotate the box about its rope-attach point, cache frame
      const frames = new Map<number, CardFrame>();
      for (const n of nodes) {
        if (!n.card) continue;
        const p = world.points[n.point];
        const bl = world.points[n.bl];
        const br = world.points[n.br];
        let rx = br.x - bl.x;
        let ry = br.y - bl.y;
        const rl = Math.hypot(rx, ry) || 1;
        rx /= rl;
        ry /= rl;
        // rotation is the bottom edge's angle → 0 when level, correct CSS sign
        const deg = (Math.atan2(ry, rx) * 180) / Math.PI;
        const nx = -ry; // "down" = right rotated +90°
        const ny = rx;
        const uL = (bl.x - p.x) * rx + (bl.y - p.y) * ry;
        const uR = (br.x - p.x) * rx + (br.y - p.y) * ry;
        frames.set(n.point, {
          x: p.x,
          y: p.y,
          rx,
          ry,
          nx,
          ny,
          uL,
          uR,
          h: n.h,
          deg,
        });
        // origin is the attach fraction (set as transform-origin in the JSX), so
        // translate the top-left there and rotate about it.
        const tf = `translate(${r1(p.x - n.af * n.w)}px, ${r1(p.y)}px) rotate(${r1(deg)}deg)`;
        if (tf !== n.lastT) {
          n.el.style.transform = tf;
          n.lastT = tf;
        }
      }
      // pass 2 — everything else. A bolted chip spins with its card (rigid body
      // = orbit from physics + the card's own angle); a detached one tumbles free.
      for (const n of nodes) {
        if (n.card) continue;
        const p = world.points[n.point];
        const base = `translate(${r1(p.x - n.w / 2)}px, ${r1(p.y - n.h / 2)}px)`;
        let tf: string;
        if (n.chip && !snapped.has(n.id)) {
          const f = frames.get(n.cardPv);
          tf = f ? `${base} rotate(${r1(f.deg)}deg)` : base;
        } else {
          tf = base;
        }
        if (tf !== n.lastT) {
          n.el.style.transform = tf;
          n.lastT = tf;
        }
      }
      for (const line of ropeLines) {
        const s = world.sticks[Number(line.dataset.stick)];
        const a = world.points[s.a];
        const b = world.points[s.b];
        line.setAttribute('x1', String(a.x));
        line.setAttribute('y1', String(a.y));
        line.setAttribute('x2', String(b.x));
        line.setAttribute('y2', String(b.y));
      }
      // rigid rods: inner end = chip center projected onto the card frame and
      // clamped to the real box rectangle → the rod always starts on the border.
      for (const line of strutLines) {
        const ch = scene.chips[Number(line.dataset.strut)];
        const f = frames.get(ch.cardPoint);
        if (!f || snapped.has(ch.id)) {
          line.style.opacity = '0'; // detached / no frame → hide
          continue;
        }
        line.style.opacity = '1';
        const cp = world.points[ch.point];
        const relx = cp.x - f.x;
        const rely = cp.y - f.y;
        const u = Math.max(f.uL, Math.min(f.uR, relx * f.rx + rely * f.ry));
        const v = Math.max(0, Math.min(f.h, relx * f.nx + rely * f.ny));
        const ax = f.x + f.rx * u + f.nx * v;
        const ay = f.y + f.ry * u + f.ny * v;
        line.setAttribute('x1', String(ax));
        line.setAttribute('y1', String(ay));
        line.setAttribute('x2', String(cp.x));
        line.setAttribute('y2', String(cp.y));
      }
    };

    // Scrolling the (parent) container imparts inertia: the hanging masses lag
    // behind the anchors when the scroll speed changes, so they swing. The kick
    // is scaled by each point's inverse mass (im), so a heavier body — a bigger
    // card, whose corners carry more mass — gets a smaller velocity change and
    // swings less than a small, light one.
    const scroller = stage.parentElement;
    let prevScroll = scroller?.scrollLeft ?? 0;
    let prevVel = 0;
    const applyScrollInertia = () => {
      if (!scroller) return;
      const sl = scroller.scrollLeft;
      const vel = sl - prevScroll;
      const acc = vel - prevVel;
      prevScroll = sl;
      prevVel = vel;
      if (Math.abs(acc) < 0.05) return;
      const k = 0.16;
      for (const p of world.points) {
        if (p.pinned || p.held) continue;
        p.px += acc * k * p.im; // heavier point (smaller im) → smaller kick → more inertia
      }
    };

    // Reveal cue: the initial drop swings the cards to equilibrium; watch the
    // fastest node and fire once it's crawled for a few frames (or after a hard
    // cap, so we always reveal). Verlet velocity = current − previous position.
    let settleFrames = 0;
    let frameCount = 0;
    let settledFired = false;
    const checkSettled = () => {
      if (settledFired) return;
      frameCount++;
      let maxV = 0;
      for (const p of world.points) {
        if (p.pinned) continue;
        const dx = p.x - p.px;
        const dy = p.y - p.py;
        const v = dx * dx + dy * dy;
        if (v > maxV) maxV = v;
      }
      if (maxV < 0.12)
        settleFrames++; // < ~0.35px/step
      else settleFrames = 0;
      if (settleFrames >= 5 || frameCount >= 200) {
        settledFired = true;
        onSettledRef.current?.();
      }
    };

    const loop = () => {
      applyScrollInertia();
      step(world, 20); // extra iterations keep the rigid triangles stiff
      render();
      checkSettled();
      rafRef.current = requestAnimationFrame(loop);
    };

    // --- pointer interaction -------------------------------------------------
    const local = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    let dragPoint = -1;
    let dragOff = { x: 0, y: 0 };
    let pressSnap = '';
    let pressAt = { x: 0, y: 0 };

    const snap = (id: string) => {
      if (!id || snapped.has(id)) return;
      const sticks = chipSticksById.get(id);
      if (!sticks) return;
      snapped.add(id);
      for (const s of sticks) world.sticks[s].broken = true; // cut all links → it drops
    };

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const cardEl = target.closest<HTMLElement>('[data-card]');
      if (cardEl) {
        dragPoint = Number(cardEl.dataset.point);
        const l = local(e);
        const p = world.points[dragPoint];
        dragOff = { x: l.x - p.x, y: l.y - p.y };
        p.held = true;
        e.preventDefault();
        return;
      }
      const snapEl = target.closest<HTMLElement>('[data-snap]');
      if (snapEl) {
        pressSnap = snapEl.dataset.snap ?? '';
        pressAt = local(e);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (dragPoint < 0) return;
      const l = local(e);
      const p = world.points[dragPoint];
      p.px = p.x;
      p.py = p.y;
      p.x = l.x - dragOff.x;
      p.y = l.y - dragOff.y;
    };

    const onUp = (e: PointerEvent) => {
      if (dragPoint >= 0) {
        world.points[dragPoint].held = false;
        dragPoint = -1;
        return;
      }
      if (pressSnap) {
        const l = local(e);
        if (Math.hypot(l.x - pressAt.x, l.y - pressAt.y) < 6) snap(pressSnap);
        pressSnap = '';
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = (e.target as HTMLElement)?.closest<HTMLElement>('[data-snap]');
      if (el) {
        snap(el.dataset.snap ?? '');
        e.preventDefault();
      }
    };

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    stage.addEventListener('keydown', onKey);

    render();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      stage.removeEventListener('keydown', onKey);
    };
  }, [scene, active, stageRef]);

  return { reset };
}
