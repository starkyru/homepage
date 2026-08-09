'use client';

import type { RefObject } from 'react';

import type { Fireworks } from './fireworks';
import { palette } from './model';
import type { World } from './physics';
import { launch, vanish } from './physics';

const ARMED_RED = 'rgba(255,70,70,.9)';
const APEX_SHARE = 0.8; // it goes off 80% of the way up the screen
const BURST_COUNT = 20; // 20 ± 4 particles, each its own colour
const BURST_SPREAD = 4;
const BURST_SPEED = 1.35; // a bigger charge than a disc's, thrown further

interface Rocket {
  point: number;
  el: HTMLElement;
}

export interface ChipRockets {
  /** A chip has just been snapped off its card — say what it can do now. */
  snapped(el: HTMLElement): void;
  /** Tap on a chip already lying loose: arm it, or set an armed one off. */
  tap(id: string, el: HTMLElement, point: number): void;
  /** Per frame: anything that has reached its apex goes off there. */
  tick(): void;
  /** Chain reset — nothing is armed, in the air, or spent any more. */
  clear(): void;
}

/**
 * The second life of a snapped-off chip.
 *
 * A chip that has been cut loose can be tapped again to arm it — the same red
 * halo the stack ball's discs get — and once armed, a tap launches it: it climbs
 * under thrust to about 80% of the way up the screen and airbursts there, in
 * twenty-odd particles of assorted colours. Anything else armed that the sparks
 * reach goes off too, since they all report to the same particle layer.
 *
 * Both chains drive this: the geometry is theirs, the sequence is the same.
 */
export function createChipRockets(
  world: World,
  stage: HTMLElement,
  fxRef: RefObject<Fireworks | null>,
): ChipRockets {
  const armed = new Map<string, HTMLElement>();
  const flying: Rocket[] = [];
  const spent = new Set<HTMLElement>();

  const label = (el: HTMLElement, verb: string) => {
    const name = el.getAttribute('title') ?? '';
    el.setAttribute('aria-label', `${name} — press Enter to ${verb}`);
  };

  const dress = (el: HTMLElement, on: boolean) => {
    // The halo is a class (box-shadow), the border is inline: the chip's own
    // border colour is an inline style, and only another inline one outranks it.
    el.classList.toggle('pop-armed', on);
    el.style.borderColor = on ? ARMED_RED : palette.amber;
    label(el, on ? 'set it off' : 'arm it');
  };

  const detonate = (rk: Rocket) => {
    const p = world.points[rk.point];
    fxRef.current?.burst(p.x, p.y, {
      count: BURST_COUNT,
      spread: BURST_SPREAD,
      rainbow: true,
      speed: BURST_SPEED,
    });
    rk.el.style.visibility = 'hidden';
    rk.el.setAttribute('aria-hidden', 'true');
    rk.el.tabIndex = -1;
    spent.add(rk.el);
    vanish(world, rk.point); // out of the sim; the pieces are the particles now
  };

  return {
    snapped(el) {
      label(el, 'arm it');
    },

    tap(id, el, point) {
      if (spent.has(el)) return;
      if (armed.delete(id)) {
        dress(el, false);
        launch(world, point);
        flying.push({ point, el });
        return;
      }
      armed.set(id, el);
      dress(el, true);
    },

    tick() {
      if (!flying.length) return;
      // Read per frame, not at launch: the stage scrolls under the flight, and
      // "80% up the screen" is about the screen, not about the stage.
      const rect = stage.getBoundingClientRect();
      const apex = -rect.top + window.innerHeight * (1 - APEX_SHARE);
      for (let i = flying.length - 1; i >= 0; i--) {
        const rk = flying[i];
        if (world.points[rk.point].y > apex) continue;
        detonate(rk);
        flying.splice(i, 1);
      }
    },

    clear() {
      for (const el of armed.values()) dress(el, false);
      armed.clear();
      flying.length = 0;
      for (const el of spent) {
        el.style.visibility = '';
        el.removeAttribute('aria-hidden');
        el.tabIndex = 0;
      }
      spent.clear();
      // Every chip is welded back on, so every chip is back to being snappable —
      // including the ones that were only snapped off and never armed.
      stage
        .querySelectorAll<HTMLElement>('[data-snap]')
        .forEach((el) => label(el, 'snap it off'));
    },
  };
}
