'use client';

import type { DiscStatus } from './discPhysics';
import { palette } from './model';

export interface Tech {
  label: string;
  src: string | null; // null → the label rides as text instead of a logo
}

interface Props {
  tech: Tech;
  discR: number;
  status: DiscStatus;
  onTap: () => void;
  ref: (el: HTMLDivElement | null) => void;
}

/** Short stand-in for technologies with no Simple Icons logo ("REST", "Zu…"). */
function abbreviate(label: string): string {
  const words = label.split(/[\s/-]+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  }
  return label.slice(0, 4);
}

/**
 * One technology inside the stack ball. Its position is written straight to the
 * node by the sim every frame, so nothing here may touch `transform` — the
 * armed halo is box-shadow only, for the same reason.
 */
export default function StackBallDisc({
  tech,
  discR,
  status,
  onTap,
  ref,
}: Props) {
  const armed = status === 'armed';
  const popped = status === 'popped';
  return (
    <div
      ref={ref}
      className={armed ? 'stack-disc pop-armed' : 'stack-disc'}
      onPointerDown={(e) => {
        e.stopPropagation(); // don't start dragging the big ball
        onTap();
      }}
      title={tech.label}
      style={{
        position: 'absolute',
        width: discR * 2,
        height: discR * 2,
        borderRadius: '50%',
        border: `1px solid ${armed ? 'rgba(255,70,70,.9)' : palette.amber}`,
        background: palette.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        willChange: 'transform',
        // Popped: gone at once, it just blew up. Back: faded in, so it does not
        // blink into the middle of the pile.
        opacity: popped ? 0 : 1,
        pointerEvents: popped ? 'none' : undefined,
        transition: popped ? 'none' : 'opacity .35s ease',
      }}
    >
      {tech.src ? (
        <img
          src={tech.src}
          alt={tech.label}
          title={tech.label}
          width={Math.round(discR * 1.1)}
          height={Math.round(discR * 1.1)}
          style={{ display: 'block', pointerEvents: 'none' }}
        />
      ) : (
        <span
          aria-label={tech.label}
          style={{
            fontSize: Math.max(7, Math.round(discR * 0.55)),
            fontWeight: 600,
            letterSpacing: '.02em',
            color: palette.amber,
            pointerEvents: 'none',
          }}
        >
          {abbreviate(tech.label)}
        </span>
      )}
    </div>
  );
}
