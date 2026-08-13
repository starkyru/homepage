'use client';

import type { Solid, World } from './physics';
import {
  addSolid,
  destroySolid,
  idleSolid,
  moveSolid,
  wakeLoose,
} from './physics';

/**
 * The chrome, made solid.
 *
 * Anything marked `data-solid="box"` or `data-solid="circle"` — the accordion
 * panel, the prev/next buttons — gets a static physics body tracking exactly
 * where it is on screen, so a chip snapped off a card lands on it and stays
 * there instead of falling past it to the floor.
 *
 * The elements are screen-fixed and the scene is not, so their place in the
 * world changes whenever the stage scrolls or the panel opens; there is nothing
 * to cache, and each sync re-measures. That costs a layout read per element per
 * frame, which is why the chains only call it once something has actually been
 * snapped off — with nothing loose, nothing can be resting on the panel and the
 * whole thing is skippable.
 *
 * Marking is by attribute and not by ref because the two chains lay their HUD
 * out completely differently — one row of three on mobile, two buttons either
 * side of a panel on desktop — and this way each just says which of its own
 * boxes are solid.
 */
export interface HudSolids {
  sync(): void;
  destroy(): void;
}

export function createHudSolids(world: World, stage: HTMLElement): HudSolids {
  const tracked = new Map<HTMLElement, Solid>();

  return {
    sync() {
      const els = document.querySelectorAll<HTMLElement>('[data-solid]');
      const frame = stage.getBoundingClientRect();
      const live = new Set<HTMLElement>();
      let moved = false;

      for (const el of els) {
        const kind = el.dataset.solid;
        if (kind !== 'box' && kind !== 'circle') continue; // switched off
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        let solid = tracked.get(el);
        if (!solid) {
          solid = addSolid(world, kind === 'circle');
          tracked.set(el, solid);
        }
        live.add(el);
        const shifted = moveSolid(
          solid,
          b.left - frame.left + b.width / 2,
          b.top - frame.top + b.height / 2,
          b.width,
          b.height,
        );
        moved = moved || shifted;
      }

      for (const [el, solid] of tracked) {
        if (live.has(el)) continue;
        // Switched off (data-solid="off") but still on the page — it will be
        // back, so keep the body and stop colliding with it. Gone from the DOM
        // is different: a strong Map would pin the detached node *and* its body
        // in the world, which outlives this hook.
        if (el.isConnected) {
          idleSolid(solid);
          continue;
        }
        destroySolid(world, solid);
        tracked.delete(el);
      }
      // Whatever is lying on a panel that just moved has to be re-solved, and a
      // sleeping chip would be left standing in mid-air — or inside the panel.
      if (moved) wakeLoose(world);
    },

    destroy() {
      for (const solid of tracked.values()) destroySolid(world, solid);
      tracked.clear();
    },
  };
}
