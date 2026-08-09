'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { Fireworks, Probe } from './fireworks';
import { createFireworks } from './fireworks';

export interface FireworksLayer {
  /**
   * Put this on a div that covers the stage and takes no pointer events. It has
   * to sit beside the ball and above the cards, not inside either: the sparks
   * leave them, and both clip their content.
   */
  hostRef: RefObject<HTMLDivElement | null>;
  /**
   * The engine, once the host is mounted. A ref rather than a value because the
   * things that fire into it — disc pops, chip airbursts — are driven from rAF
   * loops and pointer handlers that outlive any one render.
   */
  fxRef: RefObject<Fireworks | null>;
  /**
   * Watch every live particle, every frame: how a spray sets off whatever it
   * touches. Returns the unsubscribe.
   *
   * Deliberately owned by the layer and not by the engine. The engine cannot
   * exist until its host is mounted, and effects run children-first — so the
   * stack ball, which is a child of the stage, always subscribes before the
   * stage has an engine to subscribe to. Registering here means that ordering
   * cannot silently cost us the chain reaction.
   */
  watch: (probe: Probe) => () => void;
}

/**
 * One particle layer per stage, shared by everything on it that can explode.
 * Nothing here re-renders: the engine owns its nodes and its own frame loop.
 */
export function useFireworks(): FireworksLayer {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fxRef = useRef<Fireworks | null>(null);
  const probesRef = useRef<Set<Probe> | null>(null);
  probesRef.current ??= new Set();

  useEffect(() => {
    const host = hostRef.current;
    const probes = probesRef.current;
    if (!host || !probes) return;
    const fx = createFireworks(host, probes);
    fxRef.current = fx;
    return () => {
      fxRef.current = null;
      fx.destroy();
    };
  }, []);

  const watch = useCallback((probe: Probe) => {
    const probes = probesRef.current;
    probes?.add(probe);
    return () => {
      probes?.delete(probe);
    };
  }, []);

  // Stable identity, and not a nicety: the disc swarm keys its effect on this
  // layer, so a fresh object every render would tear the swarm down and respawn
  // every disc at a new random spot — the pile would jump on any state change in
  // the chain, opening the accordion included.
  return useMemo(() => ({ hostRef, fxRef, watch }), [watch]);
}
