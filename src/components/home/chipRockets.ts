'use client';

import type { RefObject } from 'react';

import type { Fireworks } from './fireworks';
import { palette } from './model';
import type { Contacts, World } from './physics';
import { launch, setLive, struck, touching, vanish } from './physics';

const ARMED_RED = 'rgba(255,70,70,.9)';
const APEX_SHARE = 0.8; // it goes off 80% of the way up the screen
const BURST_COUNT = 20; // 20 ± 4 particles, each its own colour
const BURST_SPREAD = 4;
const BURST_SPEED = 1.35; // a bigger charge than a disc's, thrown further

interface Live {
  id: string;
  point: number;
  el: HTMLElement;
  flying: boolean;
  /** What it was already touching when it was armed, or when it went up. */
  except: Contacts;
  /** Balls it was already overlapping when it went up — not hits. */
  through: Set<string>;
}

/** One tech ball on the chain, whether still welded on or lying loose. */
export interface ChipNode {
  id: string;
  point: number;
  el: HTMLElement;
}

export interface RocketDeps {
  /** Every chip on the stage — a rocket can run into any of them. */
  chips: () => ChipNode[];
  /** Do to a chip exactly what a tap on it would do. */
  tapAsUser: (id: string, el: HTMLElement, point: number) => void;
}

const label = (el: HTMLElement, verb: string) => {
  const name = el.getAttribute('title') ?? '';
  el.setAttribute('aria-label', `${name} — press Enter to ${verb}`);
};

/**
 * Every chip node on the stage back to the way the markup renders it: not armed,
 * not spent, and labelled as something to snap off.
 *
 * Standalone, because it has to run without a rockets instance. What a chip
 * looks like once it has been armed or blown up is written straight to its
 * element, and the instance that wrote it dies with the chain — so a chain that
 * comes back (out of boring mode, or in off /projects) has nobody left to undo
 * it, and a chip that went off stays invisible for good.
 */
export function restoreChipNodes(stage: HTMLElement): void {
  stage.querySelectorAll<HTMLElement>('[data-snap]').forEach((el) => {
    el.classList.remove('pop-armed');
    el.style.borderColor = palette.amber;
    el.style.visibility = '';
    el.removeAttribute('aria-hidden');
    el.tabIndex = 0;
    label(el, 'snap off'); // as the markup words it
  });
}

export interface ChipRockets {
  /** A chip has just been snapped off its card — say what it can do now. */
  snapped(el: HTMLElement): void;
  /** Tap on a chip already lying loose: arm it, or set an armed one off. */
  tap(id: string, el: HTMLElement, point: number): void;
  /** Per frame: apexes reached, and anything that has been hit. */
  tick(): void;
  /** Chain reset — nothing is armed, in the air, or spent any more. */
  clear(): void;
}

/**
 * The second life of a snapped-off chip.
 *
 * Tap a cut-loose chip and it arms — the same red halo the stack ball's discs
 * get. Tap it again and it launches: it climbs under thrust to about 80% of the
 * way up the screen and airbursts there, in twenty-odd particles of assorted
 * colours. Anything else armed that the sparks reach goes off too, since they
 * all report to the same particle layer.
 *
 * Armed is a live state, not just a colour. Anything that runs into a lit chip
 * sets it off, on the ground or in the air: the accordion opening underneath and
 * shoving it into a card, another ball landing on it, or its own flight running
 * into a ball on the way up. A rocket never comes back down — it either reaches
 * its apex or goes off against whatever it met first.
 *
 * Both chains drive this: the geometry is theirs, the sequence is the same.
 */
export function createChipRockets(
  world: World,
  stage: HTMLElement,
  fxRef: RefObject<Fireworks | null>,
  deps: RocketDeps,
): ChipRockets {
  const live: Live[] = [];
  const spent = new Set<HTMLElement>();

  const dress = (el: HTMLElement, on: boolean) => {
    // The halo is a class (box-shadow), the border is inline: the chip's own
    // border colour is an inline style, and only another inline one outranks it.
    el.classList.toggle('pop-armed', on);
    el.style.borderColor = on ? ARMED_RED : palette.amber;
    label(el, on ? 'set it off' : 'arm it');
  };

  const detonate = (l: Live) => {
    const p = world.points[l.point];
    fxRef.current?.burst(p.x, p.y, {
      count: BURST_COUNT,
      spread: BURST_SPREAD,
      rainbow: true,
      speed: BURST_SPEED,
    });
    dress(l.el, false);
    l.el.style.visibility = 'hidden';
    l.el.setAttribute('aria-hidden', 'true');
    l.el.tabIndex = -1;
    spent.add(l.el);
    vanish(world, l.point); // out of the sim; the pieces are the particles now
  };

  /**
   * A rocket has flown into a ball. Whatever a tap would have done to that ball,
   * do — it is knocked off its card, or armed. One that was already lit goes off
   * where it stands, the same as being hit by anything else.
   */
  const strike = (node: ChipNode) => {
    const target = live.find((l) => l.id === node.id);
    if (target) {
      const at = live.indexOf(target);
      detonate(target);
      live.splice(at, 1);
      return;
    }
    deps.tapAsUser(node.id, node.el, node.point);
  };

  /** Every ball whose circle the one at `point` is inside right now. */
  const overlapping = (point: number, self: string): Set<string> => {
    const p = world.points[point];
    const out = new Set<string>();
    for (const node of deps.chips()) {
      if (node.id === self || spent.has(node.el)) continue;
      const q = world.points[node.point];
      if (q && Math.hypot(q.x - p.x, q.y - p.y) < p.r + q.r) out.add(node.id);
    }
    return out;
  };

  /**
   * The ball a rocket is flying through, if any. Geometry, not contacts: a lit
   * chip passes through the scenery by design, and a chip still welded to its
   * card is a phantom to the solver either way — so the one thing most worth
   * hitting is the one thing the solver will never report.
   */
  const flownInto = (rk: Live): ChipNode | null => {
    const p = world.points[rk.point];
    for (const node of deps.chips()) {
      if (node.id === rk.id || spent.has(node.el)) continue;
      if (rk.through.has(node.id)) continue; // it launched from inside this one
      const q = world.points[node.point];
      if (!q) continue;
      if (Math.hypot(q.x - p.x, q.y - p.y) < p.r + q.r) return node;
    }
    return null;
  };

  return {
    snapped(el) {
      label(el, 'arm it');
    },

    tap(id, el, point) {
      if (spent.has(el)) return;
      const armed = live.find((l) => l.id === id);
      if (armed) {
        if (armed.flying) return; // already up there
        launch(world, point); // the halo stays on: it is still live
        armed.flying = true;
        // Re-taken as it leaves: it has been lying there since it was armed, and
        // may well have been leant on in the meantime. Balls it is already
        // inside are not hits either, or it would strike the pile it sat in.
        armed.except = touching(world, point);
        armed.through = overlapping(point, id);
        return;
      }
      dress(el, true);
      setLive(world, point, true); // lit: it stops bumping into the scenery
      live.push({
        id,
        point,
        el,
        flying: false,
        except: touching(world, point),
        through: new Set(),
      });
    },

    tick() {
      if (!live.length) return;
      // Read per frame, not at launch: the stage scrolls under the flight, and
      // "80% up the screen" is about the screen, not about the stage.
      const rect = stage.getBoundingClientRect();
      const apex = -rect.top + window.innerHeight * (1 - APEX_SHARE);

      for (let i = live.length - 1; i >= 0; i--) {
        const l = live[i];
        // Hitting something is what a live chip does: it goes off, in the air
        // or on the ground, and whatever it ran into reacts as if tapped.
        const ball = l.flying ? flownInto(l) : null;
        if (ball) {
          detonate(l);
          live.splice(i, 1);
          strike(ball);
          continue;
        }
        if (struck(world, l.point, l.except)) {
          detonate(l);
          live.splice(i, 1);
          continue;
        }
        if (l.flying && world.points[l.point].y <= apex) {
          detonate(l);
          live.splice(i, 1);
        }
      }
    },

    clear() {
      live.length = 0;
      spent.clear();
      // Every chip is welded back on, so every chip is back to being snappable —
      // including the ones that were only snapped off and never armed. The world
      // side belongs to `reset`, which re-welds each chip and puts the collision
      // filter it was armed or launched with back as it goes.
      restoreChipNodes(stage);
    },
  };
}
