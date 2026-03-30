'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// ——— Theme context ———
const ThemeContext = createContext<{ isDark: boolean; toggle: () => void }>({
  isDark: false,
  toggle: () => {},
});
export const useTheme = () => useContext(ThemeContext);

// ——— Constants ———
const NUM_GRAINS = 6; // Number of pre-generated grain textures cycled for noise effect
const NUM_RAYS = 8; // Number of sun rays
const SUN_R = 14; // Sun body radius in px
const MOON_R = 14; // Moon body radius in px (matches sun)
const RAY_SIZE = 600; // Offscreen canvas size for ray compositing (px)
const RAY_C = RAY_SIZE / 2; // Ray canvas center offset
const MOON_OFF_SIZE = 80; // Offscreen canvas size for moon crescent compositing (px)
const MOON_OFF_C = MOON_OFF_SIZE / 2; // Moon canvas center offset
const TRANSITION_MS = 1200; // Day/night transition duration in ms
const MOON_BASE_ROT = -Math.PI / 6; // Moon resting rotation angle (~-30 deg)
const NUM_WAVE_PTS = 24; // Points per wave ring (Catmull-Rom spline resolution)
const RAY_INNER_ANGLE = 0.28; // Half-angle of ray at the sun body root (radians)

// ——— Helpers ———
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function makeGrain(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d')!;
  const img = x.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (60 + Math.random() * 150) | 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

// ——— Stars ———
interface StaticStar {
  angle: number;
  dist: number;
  size: number;
  phase: number;
  spd: number;
}

function generateStaticStars(n: number): StaticStar[] {
  return Array.from({ length: n }, (_, i) => ({
    angle: i * 2.39996,
    dist: 60 + ((i * 73 + i * i * 17) % 400),
    size: 0.5 + (i % 4) * 0.4,
    phase: (i * 0.618) % (Math.PI * 2),
    spd: 0.6 + (i % 5) * 0.3,
  }));
}

interface MovingStar {
  startAngle: number;
  r: number;
  span: number;
  progress: number;
  speed: number;
  size: number;
  brightness: number;
  twinkle: number;
}

function newMovingStar(): MovingStar {
  return {
    startAngle: Math.random() * Math.PI * 2,
    r: 30 + Math.random() * 300,
    span:
      (0.25 + Math.random() * 0.65) * Math.PI * (Math.random() > 0.5 ? 1 : -1),
    progress: Math.random(),
    speed: (0.0015 + Math.random() * 0.004) / 4,
    size: 0.6 + Math.random() * 2,
    brightness: 0.45 + Math.random() * 0.55,
    twinkle: Math.random() * Math.PI * 2,
  };
}

// ——— Waves ———
function envelope(phase: number, gap: number, falloff: number): number {
  if (phase > gap) return 0;
  const p = phase / gap;
  const ATK = 0.1;
  if (p < ATK) return p / ATK;
  return Math.pow((1 - p) / (1 - ATK), falloff);
}

function catmull(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
) {
  const n = pts.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    if (i === 0) ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y,
    );
  }
  ctx.closePath();
}

// Pre-generate static star positions
const STATIC_STARS = generateStaticStars(80);

// ——— Component ———
export default function DayNightBackground({
  children,
}: {
  children: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef(0);
  const grainsRef = useRef<HTMLCanvasElement[]>([]);
  const rayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const moonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const movingStarsRef = useRef<MovingStar[]>([]);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const initDark = isDark;
  const stRef = useRef({
    t: 0,
    gfi: 0,
    fc: 0,
    progress: initDark ? 1 : 0, // 0 = day, 1 = night
    target: initDark ? 1 : 0,
    transStart: -1,
    transFrom: 0,
    hovered: false,
    cx: 0,
    cy: 0,
    mobile: false, // True when viewport width < 768px
    rotAng: 0, // Accumulated ray rotation angle (radians)
    angAnim: 0, // Accumulated ray wobble phase
    smoothHoverSpeed: 1.0, // Smoothly interpolated hover speed multiplier
  });

  const toggle = useCallback(() => {
    const s = stRef.current;
    s.target = s.target === 0 ? 1 : 0;
    s.transStart = performance.now();
    s.transFrom = s.progress;
    const dark = s.target === 1;
    setIsDark(dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, []);

  // Sync dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // Init offscreen canvases
    grainsRef.current = Array.from({ length: NUM_GRAINS }, () =>
      makeGrain(256, 256),
    );
    movingStarsRef.current = Array.from({ length: 40 }, newMovingStar);

    const rayCanvas = document.createElement('canvas');
    rayCanvas.width = RAY_SIZE;
    rayCanvas.height = RAY_SIZE;
    rayCanvasRef.current = rayCanvas;

    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = MOON_OFF_SIZE;
    moonCanvas.height = MOON_OFF_SIZE;
    moonCanvasRef.current = moonCanvas;

    function updatePosition() {
      const _w = window.innerWidth;
      const cx = Math.max(40, Math.min(60, _w * 0.04));
      const cy = 50;
      stRef.current.cx = cx;
      stRef.current.cy = cy;
      if (btnRef.current) {
        const r = Math.max(SUN_R, MOON_R) + 18;
        btnRef.current.style.left = `${cx - r}px`;
        btnRef.current.style.top = `${cy - r}px`;
        btnRef.current.style.width = `${r * 2}px`;
        btnRef.current.style.height = `${r * 2}px`;
      }
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stRef.current.mobile = window.innerWidth < 768;
      updatePosition();
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const s = stRef.current;
      const now = performance.now();

      // Transition animation
      if (s.transStart >= 0) {
        const elapsed = now - s.transStart;
        const raw = Math.min(1, elapsed / TRANSITION_MS);
        s.progress = lerp(s.transFrom, s.target, easeInOutCubic(raw));
        if (raw >= 1) s.transStart = -1;
      }

      s.t += 0.008;
      s.fc++;

      const t = s.t;
      const prog = s.progress;
      const day = 1 - prog;
      const night = prog;
      const W = canvas.width;
      const H = canvas.height;
      const CX = s.cx;
      const CY = s.cy;

      // Hover effects (smoothly interpolated to avoid jerks)
      const targetHoverSpeed = s.hovered ? 2.0 : 1.0;
      s.smoothHoverSpeed += (targetHoverSpeed - s.smoothHoverSpeed) * 0.04; // Ease toward target
      const hoverPulse = s.hovered // Scale boost when hovering (0 or oscillating ~0.08..0.20)
        ? Math.sin(t * 5) * 0.12 + 0.08
        : 0;

      // Accumulate rotation angles incrementally (avoids jump on hover speed change)
      // Scale rotation speed with viewport width (faster on larger screens)
      const screenScale = Math.max(1, W / 1000); // 1x at 1000px, scales up without cap for large screens
      const dt = 0.008; // Matches s.t increment
      s.rotAng += (0.5 / 3) * s.smoothHoverSpeed * screenScale * dt;
      s.angAnim += (1.3 / 3) * s.smoothHoverSpeed * screenScale * dt;
      const mobileAlpha = 0.5; // Ray/wave opacity multiplier

      // ——— Background ———
      const bgR = lerp(255, 2, prog) | 0;
      const bgG = lerp(254, 8, prog) | 0;
      const bgB = lerp(250, 20, prog) | 0;
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx.fillRect(0, 0, W, H);

      // ——— NIGHT: Static stars ———
      if (night > 0.05) {
        for (const star of STATIC_STARS) {
          const x = CX + Math.cos(star.angle) * star.dist;
          const y = CY + Math.sin(star.angle) * star.dist;
          if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue;
          const tw = 0.25 + Math.sin(t * star.spd + star.phase) * 0.18;
          ctx.beginPath();
          ctx.arc(x, y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(170,195,240,${(tw * night).toFixed(3)})`;
          ctx.fill();
        }
      }

      // ——— NIGHT: Moon glow ———
      if (night > 0.1) {
        const glowR = MOON_R * 3;
        const g = ctx.createRadialGradient(CX, CY, MOON_R * 0.5, CX, CY, glowR);
        g.addColorStop(0, `rgba(35,75,210,${(0.45 * night).toFixed(3)})`);
        g.addColorStop(0.35, `rgba(18,45,160,${(0.18 * night).toFixed(3)})`);
        g.addColorStop(0.7, `rgba(8,20,90,${(0.07 * night).toFixed(3)})`);
        g.addColorStop(1, 'rgba(2,8,40,0)');
        ctx.beginPath();
        ctx.arc(CX, CY, glowR, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // ——— NIGHT: Moving stars ———
      if (night > 0.05) {
        const ms = movingStarsRef.current;
        for (let i = 0; i < ms.length; i++) {
          const star = ms[i];
          star.progress += star.speed;
          star.twinkle += 0.07;
          if (star.progress >= 1) ms[i] = newMovingStar();

          const ang = star.startAngle + star.span * star.progress;
          const x = CX + Math.cos(ang) * star.r;
          const y = CY + Math.sin(ang) * star.r;
          const env = Math.sin(star.progress * Math.PI);
          const tw = 0.75 + Math.sin(star.twinkle) * 0.25;
          const a = env * star.brightness * tw * night;

          ctx.beginPath();
          ctx.arc(x, y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(210,225,255,${a.toFixed(3)})`;
          ctx.fill();

          if (star.size > 1.6 && env > 0.3) {
            ctx.strokeStyle = `rgba(210,225,255,${(a * 0.5).toFixed(3)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x - star.size * 2.5, y);
            ctx.lineTo(x + star.size * 2.5, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y - star.size * 2.5);
            ctx.lineTo(x, y + star.size * 2.5);
            ctx.stroke();
          }
        }
      }

      // ——— NIGHT: Waves ———
      if (night > 0.05) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (let wi = 0; wi < 4; wi++) {
          const phase = (t * (0.16 / 3) + wi / 4) % 1; // Wave lifecycle position (0..1)
          const env = envelope(phase, 0.5, 1.2); // Brightness envelope: fade in then out
          if (env < 0.002) continue;
          const eased = 0.5 - 0.5 * Math.cos(phase * Math.PI); // Smooth expansion curve
          const baseR = MOON_R + 680 * eased; // Wave ring radius from center
          const sw = // Stroke width: peaks mid-life, thin at birth/death
            1 + 7 * Math.sin(Math.min(phase / 0.5, 1) * Math.PI * 0.85);
          const pts: { x: number; y: number }[] = [];
          for (let j = 0; j < NUM_WAVE_PTS; j++) {
            const a = (j / NUM_WAVE_PTS) * Math.PI * 2; // Angle around the ring
            const ro = // Radial organic wobble (time-driven)
              Math.sin(t * 1.4 + j * 0.95 + wi * 1.8) * 4.5 +
              Math.sin(t * 0.7 - j * 0.6 + wi * 3.1) * 2.5;
            const so = // Shape wobble (angle-driven, makes ring non-circular)
              Math.sin(a * 3 + t * 0.8 + wi * 1.2) * 4 +
              Math.sin(a * 5 - t * 1.05 + wi * 2.4) * 2;
            pts.push({
              x: CX + Math.cos(a) * (baseR + ro + so),
              y: CY + Math.sin(a) * (baseR + ro + so),
            });
          }
          const na = night * mobileAlpha; // Wave opacity, scaled by night progress and mobile factor
          catmull(ctx, pts);
          ctx.strokeStyle = `rgba(30,80,220,${(env * 0.1 * na).toFixed(3)})`;
          ctx.lineWidth = sw * 5;
          ctx.stroke();
          catmull(ctx, pts);
          ctx.strokeStyle = `rgba(55,115,240,${(env * 0.2 * na).toFixed(3)})`;
          ctx.lineWidth = sw * 2.8;
          ctx.stroke();
          catmull(ctx, pts);
          ctx.strokeStyle = `rgba(100,165,255,${(env * 0.42 * na).toFixed(3)})`;
          ctx.lineWidth = sw * 1.4;
          ctx.stroke();
          catmull(ctx, pts);
          ctx.strokeStyle = `rgba(170,210,255,${(env * 0.65 * na).toFixed(3)})`;
          ctx.lineWidth = Math.max(0.4, sw * 0.55);
          ctx.stroke();
          catmull(ctx, pts);
          ctx.strokeStyle = `rgba(230,242,255,${(env * 0.75 * na).toFixed(3)})`;
          ctx.lineWidth = Math.max(0.3, sw * 0.18);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ——— DAY: Sun rays ———
      if (day > 0.01) {
        const rc = rayCanvasRef.current!;
        const rx = rc.getContext('2d')!;
        const rotAng = s.rotAng; // Accumulated rotation angle of the ray group
        const angAnim = s.angAnim; // Accumulated phase for per-ray angular wobble
        const rayAlpha = 0.45 * day * mobileAlpha; // Ray opacity, fades out during night transition
        const scale = 1 + hoverPulse; // Hover-driven size multiplier

        for (let i = 0; i < NUM_RAYS; i++) {
          const a = rotAng + (i / NUM_RAYS) * Math.PI * 2; // Angle of this ray
          const p = Math.sin(t * 2.1 + i) * 0.4; // Per-ray pulse factor (-0.4..0.4)
          const outerR = (SUN_R + 240 + p * 80) * scale; // Ray tip distance from center
          // oA = outer half-angle of the ray tip (radians), animated per ray
          const oA = 0.18 + Math.sin(angAnim + i * 0.8) * 0.18 * 0.3;

          rx.clearRect(0, 0, RAY_SIZE, RAY_SIZE);

          // Longitudinal gradient along ray
          const lx0 = RAY_C + Math.cos(a) * SUN_R;
          const ly0 = RAY_C + Math.sin(a) * SUN_R;
          const lx1 = RAY_C + Math.cos(a) * outerR;
          const ly1 = RAY_C + Math.sin(a) * outerR;
          const longGrd = rx.createLinearGradient(lx0, ly0, lx1, ly1);
          longGrd.addColorStop(0, `rgba(255,195,0,${rayAlpha.toFixed(2)})`);
          longGrd.addColorStop(
            0.325,
            `rgba(255,230,40,${(rayAlpha * 0.6).toFixed(2)})`,
          );
          longGrd.addColorStop(1, 'rgba(255,245,100,0)');

          // Ray trapezoid shape
          rx.beginPath();
          rx.moveTo(
            RAY_C + Math.cos(a - RAY_INNER_ANGLE) * SUN_R,
            RAY_C + Math.sin(a - RAY_INNER_ANGLE) * SUN_R,
          );
          rx.lineTo(
            RAY_C + Math.cos(a - oA) * outerR,
            RAY_C + Math.sin(a - oA) * outerR,
          );
          rx.lineTo(
            RAY_C + Math.cos(a + oA) * outerR,
            RAY_C + Math.sin(a + oA) * outerR,
          );
          rx.lineTo(
            RAY_C + Math.cos(a + RAY_INNER_ANGLE) * SUN_R,
            RAY_C + Math.sin(a + RAY_INNER_ANGLE) * SUN_R,
          );
          rx.closePath();
          rx.fillStyle = longGrd;
          rx.fill();

          // Perpendicular soft-edge mask (fades ray edges sideways)
          const midR = (SUN_R + outerR) * 0.5; // Midpoint distance along the ray
          const halfSpan = oA * outerR; // Half-width of the perpendicular gradient
          const ax2 = RAY_C + Math.cos(a) * midR; // Gradient center x
          const ay2 = RAY_C + Math.sin(a) * midR; // Gradient center y
          const pd = a + Math.PI / 2; // Perpendicular direction angle
          const perpGrd = rx.createLinearGradient(
            ax2 + Math.cos(pd) * halfSpan,
            ay2 + Math.sin(pd) * halfSpan,
            ax2 - Math.cos(pd) * halfSpan,
            ay2 - Math.sin(pd) * halfSpan,
          );
          for (let j = 0; j <= 28; j++) {
            const sv = j / 28;
            perpGrd.addColorStop(
              sv,
              `rgba(0,0,0,${Math.pow(Math.sin(sv * Math.PI), 1.2).toFixed(3)})`,
            );
          }
          rx.globalCompositeOperation = 'destination-in';
          rx.fillStyle = perpGrd;
          rx.fillRect(0, 0, RAY_SIZE, RAY_SIZE);
          rx.globalCompositeOperation = 'source-over';

          // Blit ray onto main canvas
          ctx.drawImage(
            rc,
            0,
            0,
            RAY_SIZE,
            RAY_SIZE,
            CX - RAY_C,
            CY - RAY_C,
            RAY_SIZE,
            RAY_SIZE,
          );
        }
      }

      // ——— Sun circle ———
      if (day > 0.01) {
        const sunScale = Math.max(0, 1 - prog * 1.8); // Shrinks to 0 during transition to night
        const sunR = SUN_R * (1 + hoverPulse) * sunScale; // Effective sun radius with hover pulse
        if (sunR > 0.5) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, day * 2.5);
          const sg = ctx.createRadialGradient(CX - 4, CY - 4, 1, CX, CY, sunR);
          sg.addColorStop(0, '#FFF268');
          sg.addColorStop(0.4, '#FFCC10');
          sg.addColorStop(1, '#F09800');
          ctx.beginPath();
          ctx.arc(CX, CY, sunR, 0, Math.PI * 2);
          ctx.fillStyle = sg;
          ctx.fill();
          ctx.restore();
        }
      }

      // ——— Moon (offscreen compositing for crescent) ———
      if (night > 0.15) {
        const moonAlpha = Math.min(1, (night - 0.15) / 0.6); // Moon fade-in (0..1), delayed until night > 0.15
        const moonHoverScale = s.hovered // 30% bigger + subtle pulse on hover
          ? 1.3 + Math.sin(t * 4) * 0.05
          : 1;
        const moonR = MOON_R * moonAlpha * moonHoverScale; // Effective moon radius

        if (moonR > 1) {
          const mc = moonCanvasRef.current!;
          const mx = mc.getContext('2d')!;

          const DEG15 = (15 * Math.PI) / 180; // 15 degrees in radians
          const rock = // Pendulum-like rocking angle (+/-15 deg)
            DEG15 *
            (Math.sin(t * 0.56) * 0.65 + Math.sin(t * 1.04 + 1.1) * 0.35);

          // Draw moon on offscreen (centered, no rotation)
          mx.clearRect(0, 0, MOON_OFF_SIZE, MOON_OFF_SIZE);

          const mg = mx.createRadialGradient(
            MOON_OFF_C - 6 * moonAlpha,
            MOON_OFF_C - 5 * moonAlpha,
            2 * moonAlpha,
            MOON_OFF_C,
            MOON_OFF_C,
            moonR,
          );
          mg.addColorStop(0, '#FFFEE8');
          mg.addColorStop(0.28, '#F9E898');
          mg.addColorStop(0.65, '#E8C050');
          mg.addColorStop(1, '#BE8C28');
          mx.beginPath();
          mx.arc(MOON_OFF_C, MOON_OFF_C, moonR, 0, Math.PI * 2);
          mx.fillStyle = mg;
          mx.fill();

          // Inner highlight ring
          mx.beginPath();
          mx.arc(
            MOON_OFF_C - 3 * moonAlpha,
            MOON_OFF_C - 3 * moonAlpha,
            moonR * 0.88,
            0,
            Math.PI * 2,
          );
          mx.strokeStyle = 'rgba(255,250,210,0.12)';
          mx.lineWidth = 1.5 * moonAlpha;
          mx.stroke();

          // Crescent cutout (safe on offscreen)
          mx.globalCompositeOperation = 'destination-out';
          mx.beginPath();
          mx.arc(
            MOON_OFF_C + moonR * 0.62,
            MOON_OFF_C,
            moonR * 1.03,
            0,
            Math.PI * 2,
          );
          mx.fillStyle = 'black';
          mx.fill();
          mx.globalCompositeOperation = 'source-over';

          // Blit to main canvas with rotation
          ctx.save();
          ctx.translate(CX, CY);
          ctx.rotate(MOON_BASE_ROT + rock);
          ctx.globalAlpha = moonAlpha;
          ctx.drawImage(
            mc,
            0,
            0,
            MOON_OFF_SIZE,
            MOON_OFF_SIZE,
            -MOON_OFF_C,
            -MOON_OFF_C,
            MOON_OFF_SIZE,
            MOON_OFF_SIZE,
          );
          ctx.restore();
        }
      }

      // ——— Grain overlay ———
      if (s.fc % 2 === 0) s.gfi = (s.gfi + 1) % NUM_GRAINS;
      const grain = grainsRef.current[s.gfi];
      if (grain) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = lerp(0.3, 0.42, prog);
        const pat = ctx.createPattern(grain, 'repeat');
        if (pat) {
          ctx.fillStyle = pat;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <button
        ref={btnRef}
        onClick={toggle}
        onMouseEnter={() => {
          stRef.current.hovered = true;
        }}
        onMouseLeave={() => {
          stRef.current.hovered = false;
        }}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          position: 'fixed',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          zIndex: 2,
          padding: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </ThemeContext.Provider>
  );
}
