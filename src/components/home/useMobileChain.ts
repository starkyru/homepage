import { RefObject, useCallback, useEffect, useRef } from 'react';

import type { ChipNode, ChipRockets } from './chipRockets';
import { createChipRockets } from './chipRockets';
import type { Fireworks } from './fireworks';
import { createHudSolids } from './hudSolids';
import { MOBILE_HEADER_H, MOBILE_NAV_H, type MobileScene } from './model';
import {
  breakStick,
  clampSpeed,
  dragTo,
  grab,
  maxSpeed,
  nudge,
  release,
  reset as resetWorld,
  step,
} from './physics';

// Round transforms to 0.1px so a settled node writes an identical string
// frame-to-frame; identical writes are skipped (keeps native tooltips alive and
// trims layout churn).
const r1 = (v: number) => Math.round(v * 10) / 10;

interface Node {
  el: HTMLElement;
  point: number;
  w: number;
  h: number;
  card: boolean;
  chip: boolean;
  id: string; // chip id (snapped check)
  cardPv: number; // a chip's box Pv, to inherit the box angle
  af: number; // box attach fraction (rotation pivot / origin)
  bl: number;
  br: number;
  lastT: string;
}

interface BoxFrame {
  x: number; // pivot (rope attach) in stage coords
  y: number;
  rx: number; // unit right axis = normalized (BR − BL)
  ry: number;
  nx: number; // unit down axis = right rotated +90°
  ny: number;
  h: number; // rendered box height
  deg: number; // box rotation = bottom-edge angle
  uL: number;
  uR: number;
}

/**
 * Drives the mobile vertical strand: a fixed logo circle on top, then a linked
 * chain of experience boxes, each with snappable tech chips welded to its
 * sides. One rAF loop mutates DOM transforms directly (no React re-render).
 * Boxes drag to swing (touch-action:none, so a touch on a box grabs it instead
 * of scrolling); chips snap off on tap; a tap on a box opens the bottom
 * accordion. Vertical scroll of the container adds a gentle bob. Inert while
 * `active` is false.
 */
export function useMobileChain(
  stageRef: RefObject<HTMLDivElement | null>,
  scrollRef: RefObject<HTMLDivElement | null>,
  scene: MobileScene,
  active: boolean,
  onSettled?: () => void, // fired once the strand stops moving (reveal cue)
  onBoxClick?: (index: number) => void, // tap (not drag) on a box
  fxRef?: RefObject<Fireworks | null>, // stage particle layer, for chip rockets
) {
  const rafRef = useRef<number | null>(null);
  const snappedRef = useRef<Set<string>>(new Set());
  const rocketsRef = useRef<ChipRockets | null>(null);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const onBoxClickRef = useRef(onBoxClick);
  onBoxClickRef.current = onBoxClick;

  const reset = useCallback(() => {
    resetWorld(scene.world); // restores the rest pose and re-welds every chip
    snappedRef.current.clear();
    rocketsRef.current?.clear(); // and un-arms / brings back the ones that went off
  }, [scene]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !active) return;

    const { world } = scene;
    const snapped = snappedRef.current;
    const chipSticksById = new Map<string, number[]>();
    for (const c of scene.chips) chipSticksById.set(c.id, c.sticks);
    // Filled once the node list below is built; the rockets read it lazily, as
    // a chip in flight can run into any ball on the stage — welded ones too.
    const chipNodes: ChipNode[] = [];
    const rockets = fxRef
      ? createChipRockets(world, stage, fxRef, {
          chips: () => chipNodes,
          tapAsUser: (id, el) => hitChip(id, el),
        })
      : null;
    rocketsRef.current = rockets;
    const solids = createHudSolids(world, stage);

    const nodes: Node[] = [];
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
    for (const n of nodes) {
      if (n.chip) chipNodes.push({ id: n.id, point: n.point, el: n.el });
    }

    const ropeLines = Array.from(
      stage.querySelectorAll<SVGLineElement>('line[data-stick]'),
    );
    const strutLines = Array.from(
      stage.querySelectorAll<SVGLineElement>('line[data-strut]'),
    );

    const render = () => {
      // pass 1 — boxes: rotate about the rope-attach point, cache the frame
      const frames = new Map<number, BoxFrame>();
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
        const deg = (Math.atan2(ry, rx) * 180) / Math.PI;
        const nx = -ry;
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
          h: n.h,
          deg,
          uL,
          uR,
        });
        const tf = `translate(${r1(p.x - n.af * n.w)}px, ${r1(p.y)}px) rotate(${r1(deg)}deg)`;
        if (tf !== n.lastT) {
          n.el.style.transform = tf;
          n.lastT = tf;
        }
      }
      // pass 2 — chips (spin with their box until snapped) + the fixed circle
      for (const n of nodes) {
        if (n.card) continue;
        const p = world.points[n.point];
        const base = `translate(${r1(p.x - n.w / 2)}px, ${r1(p.y - n.h / 2)}px)`;
        let tf: string;
        if (n.chip) {
          // Bolted on, a chip spins with its box; cut loose it tumbles and rolls
          // on its own, so take the angle straight off its body.
          const deg = snapped.has(n.id)
            ? (p.body.getAngle() * 180) / Math.PI
            : frames.get(n.cardPv)?.deg;
          tf = deg === undefined ? base : `${base} rotate(${r1(deg)}deg)`;
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
      // rigid rods: inner end = chip centre projected onto the box rectangle
      for (const line of strutLines) {
        const ch = scene.chips[Number(line.dataset.strut)];
        const f = frames.get(ch.cardPoint);
        if (!f || snapped.has(ch.id)) {
          line.style.opacity = '0';
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

    // Vertical scroll → the hanging masses lag behind the anchors when the
    // scroll speed changes, so the strand bobs.
    const scroller = scrollRef.current;
    let prevScroll = scroller?.scrollTop ?? 0;
    let prevVel = 0;
    const applyScrollInertia = () => {
      if (!scroller) return;
      const st = scroller.scrollTop;
      const vel = st - prevScroll;
      const acc = vel - prevVel;
      prevScroll = st;
      prevVel = vel;
      if (Math.abs(acc) < 0.05) return;
      nudge(world, 0, -acc * 0.06);
    };

    // Reveal cue: fire once the fastest body has crawled for a few frames.
    let settleFrames = 0;
    let frameCount = 0;
    let settledFired = false;
    const checkSettled = () => {
      if (settledFired) return;
      frameCount++;
      if (maxSpeed(world) < 0.35) settleFrames++;
      else settleFrames = 0;
      if (settleFrames >= 5 || frameCount >= 200) {
        settledFired = true;
        onSettledRef.current?.();
      }
    };

    // --- pointer interaction -------------------------------------------------
    const local = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    let dragPoint = -1;
    let dragStart = { x: 0, y: 0 };
    let dragClient = { x: 0, y: 0 }; // last pointer position (viewport coords)
    let pressCardIdx = -1;
    let pressSnap = '';
    let pressSnapEl: HTMLElement | null = null; // the chip that press landed on
    let pressAt = { x: 0, y: 0 };

    // Drag a box toward the top / bottom edge → auto-scroll the strand, keeping
    // the box pinned under the pointer so you can pull the view along it (touch
    // won't scroll natively while a box is held). The dead zones are the fixed
    // header (top) and the accordion bar (bottom).
    const EDGE = 120; // px from an edge where auto-scroll starts
    const EDGE_MAX = 22; // px/frame at the very edge
    const edgeScroll = () => {
      if (dragPoint < 0 || !scroller) return;
      const distTop = dragClient.y - MOBILE_HEADER_H;
      const distBottom = window.innerHeight - MOBILE_NAV_H - dragClient.y;
      let dy = 0;
      if (distTop < EDGE) dy = -EDGE_MAX * (1 - Math.max(0, distTop) / EDGE);
      else if (distBottom < EDGE)
        dy = EDGE_MAX * (1 - Math.max(0, distBottom) / EDGE);
      if (dy === 0) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      const next = Math.max(0, Math.min(max, scroller.scrollTop + dy));
      if (next === scroller.scrollTop) return; // already at the end
      scroller.scrollTop = next;
      // re-aim the drag at the pointer now that the content shifted under it
      const rect = stage.getBoundingClientRect();
      dragTo(world, dragClient.x - rect.left, dragClient.y - rect.top);
    };

    // Speed limiter: a serial pendulum chain has no bending stiffness, so a hard
    // fling can whip a box around and tangle the whole strand. Capping speed
    // bleeds off that energy so the chain can swing but never blows up. (The
    // tilt limit that used to live here is now a limit on the rope hinge itself,
    // so a box simply cannot rotate past it — see BOX_TILT in model.ts.)
    const MAX_STEP = 44; // px/frame — well above a normal drag, kills flings

    const loop = () => {
      // Before the step, so the solver sees the chrome where it is now, and only
      // once something has been snapped off that could land on it — measuring an
      // element costs a layout read.
      if (snapped.size) solids.sync();
      edgeScroll();
      applyScrollInertia();
      clampSpeed(world, MAX_STEP);
      step(world);
      render();
      rockets?.tick(); // anything in the air that has reached its apex goes off
      checkSettled();
      rafRef.current = requestAnimationFrame(loop);
    };

    // First tap cuts the chip loose. After that the same tap arms it, and then
    // launches it — see `chipRockets`.
    const hitChip = (id: string, el: HTMLElement | null) => {
      if (!id) return;
      if (snapped.has(id)) {
        if (el) rockets?.tap(id, el, Number(el.dataset.point));
        return;
      }
      const sticks = chipSticksById.get(id);
      if (!sticks) return;
      snapped.add(id);
      for (const s of sticks) breakStick(world, s); // cut the weld → it drops
      if (el) rockets?.snapped(el);
    };

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const boxEl = target.closest<HTMLElement>('[data-card]');
      if (boxEl && boxEl.dataset.kind === 'card') {
        dragPoint = Number(boxEl.dataset.point);
        pressCardIdx = Number(boxEl.dataset.card);
        dragStart = { x: e.clientX, y: e.clientY };
        dragClient = { x: e.clientX, y: e.clientY };
        const l = local(e);
        grab(world, dragPoint, l.x, l.y); // anchors the body under the pointer
        e.preventDefault();
        return;
      }
      const snapEl = target.closest<HTMLElement>('[data-snap]');
      if (snapEl) {
        pressSnap = snapEl.dataset.snap ?? '';
        pressSnapEl = snapEl;
        pressAt = local(e);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (dragPoint < 0) return;
      dragClient = { x: e.clientX, y: e.clientY };
      const l = local(e);
      dragTo(world, l.x, l.y);
    };

    const onUp = (e: PointerEvent) => {
      if (dragPoint >= 0) {
        release(world); // lets go carrying whatever momentum it built up
        dragPoint = -1;
        const moved = Math.hypot(
          e.clientX - dragStart.x,
          e.clientY - dragStart.y,
        );
        if (moved < 6 && Number.isInteger(pressCardIdx))
          onBoxClickRef.current?.(pressCardIdx);
        pressCardIdx = -1;
        return;
      }
      if (pressSnap) {
        const l = local(e);
        if (Math.hypot(l.x - pressAt.x, l.y - pressAt.y) < 6)
          hitChip(pressSnap, pressSnapEl);
        pressSnap = '';
        pressSnapEl = null;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = (e.target as HTMLElement)?.closest<HTMLElement>('[data-snap]');
      if (el) {
        hitChip(el.dataset.snap ?? '', el);
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
      release(world); // never leave a drag joint behind on unmount
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      stage.removeEventListener('keydown', onKey);
      rocketsRef.current = null;
      solids.destroy();
    };
  }, [scene, active, stageRef, scrollRef, fxRef]);

  return { reset };
}
