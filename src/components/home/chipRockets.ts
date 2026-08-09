'use client';

import type { RefObject } from 'react';

import type { Fireworks } from './fireworks';
import { palette } from './model';
import type { Contacts, World } from './physics';
import { abortLaunch, launch, struck, touching, vanish } from './physics';

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
 * Armed is a live state, not just a colour. Anything that runs into an armed
 * chip sets it off where it lies — most often the accordion opening underneath
 * and shoving it up into a card. A chip *in flight* is the opposite case: run
 * into something on the way up and the thrust simply dies, so it comes back down
 * as the loose chip it was, with no burst at all.
 *
 * Both chains drive this: the geometry is theirs, the sequence is the same.
 */
export function createChipRockets(
  world: World,
  stage: HTMLElement,
  fxRef: RefObject<Fireworks | null>,
): ChipRockets {
  const live: Live[] = [];
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

  return {
    snapped(el) {
      label(el, 'arm it');
    },

    tap(id, el, point) {
      if (spent.has(el)) return;
      const armed = live.find((l) => l.id === id);
      if (armed) {
        dress(el, false);
        launch(world, point);
        armed.flying = true;
        // Re-taken as it leaves: it has been lying there since it was armed, and
        // may well have been leant on in the meantime.
        armed.except = touching(world, point);
        return;
      }
      dress(el, true);
      live.push({
        id,
        point,
        el,
        flying: false,
        except: touching(world, point),
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
        if (struck(world, l.point, l.except)) {
          if (l.flying) {
            abortLaunch(world, l.point); // knocked out of the sky; it falls
          } else {
            detonate(l); // something ran into a live one
          }
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
      for (const l of live) dress(l.el, false);
      live.length = 0;
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
        .forEach((el) => label(el, 'snap off')); // as the markup words it
    },
  };
}
