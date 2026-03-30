import { WaterCaustics } from './waterCaustics';

// ——— Types ———
export interface PoolLetter {
  char: string;
  ox: number; // Original x position
  oy: number; // Original y position
  x: number; // Current x position (physics-driven)
  y: number; // Current y position (physics-driven)
  vx: number; // Velocity x
  vy: number; // Velocity y
  font: string; // CSS font string
}

// ——— Hardcoded params (from Waves project defaults) ———
const PARAMS = {
  gradientForce: 18000,
  springForce: 3.0,
  darkSpringBoost: 8.0,
  damping: 0.88,
  maxDisplacement: 120,
  noiseScale: 0.004,
  timeSpeed: 0.3,
  sharpness: 0.6,
  rippleAmplitude: 1.25,
  rippleWavelength: 800,
  rippleDecay: 4.8,
  rippleForce: 2350,
  rippleInterval: 90,
  waveCenterY: -0.05,
  waveAmpMul: 1.4,
} as const;

const WATER_SCALE = 3; // Downscale factor for water simulation
const DT = 1 / 60; // Physics timestep
const COLOR_BUCKETS = 10; // Number of color-displacement buckets

export class PoolEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private water: WaterCaustics;
  private letters: PoolLetter[] = [];
  private bucketColors: string[] = [];
  private rafId = 0;
  private lastFrameTime = 0;
  private running = false;

  // FPS counter
  private fpsFrames = 0;
  private fpsLastTime = 0;
  private fpsDisplay = 0;

  // Mouse/touch state for ripples
  private mouseDown = false;
  private mouseX = 0;
  private mouseY = 0;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private mouseSpeed = 0;
  private lastRippleTime = 0;

  // Bound event handlers for cleanup
  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: () => void;
  private _onTouchStart: (e: TouchEvent) => void;
  private _onTouchMove: (e: TouchEvent) => void;
  private _onTouchEnd: () => void;

  // Background color (set by theme)
  private bgColor = 'rgb(255,254,250)';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    const ww = Math.ceil(canvas.width / WATER_SCALE);
    const wh = Math.ceil(canvas.height / WATER_SCALE);
    this.water = new WaterCaustics(ww, wh);

    // Apply params to water engine
    this.water.waterScale = WATER_SCALE;
    this.water.noiseScale = PARAMS.noiseScale;
    this.water.timeSpeed = PARAMS.timeSpeed * 0.001;
    this.water.sharpness = PARAMS.sharpness;
    this.water.rippleAmplitude = PARAMS.rippleAmplitude;
    this.water.rippleWavelength = PARAMS.rippleWavelength;
    this.water.rippleDecay = PARAMS.rippleDecay * 0.001;
    this.water.waveCenterY = PARAMS.waveCenterY;
    this.water.waveAmpMul = PARAMS.waveAmpMul;

    // Default to day palette
    this.buildColorPalette(false);

    // Bind event handlers
    this._onMouseDown = (e: MouseEvent) => {
      this.mouseDown = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseSpeed = 0;
      this.water.addRipple(this.mouseX, this.mouseY, this.lastFrameTime);
      this.lastRippleTime = this.lastFrameTime;
    };

    this._onMouseMove = (e: MouseEvent) => {
      if (!this.mouseDown) return;
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      const dx = this.mouseX - this.prevMouseX;
      const dy = this.mouseY - this.prevMouseY;
      this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
    };

    this._onMouseUp = () => {
      this.mouseDown = false;
      this.mouseSpeed = 0;
    };

    this._onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      this.mouseDown = true;
      this.mouseX = t.clientX;
      this.mouseY = t.clientY;
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseSpeed = 0;
      this.water.addRipple(this.mouseX, this.mouseY, this.lastFrameTime);
      this.lastRippleTime = this.lastFrameTime;
    };

    this._onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || !this.mouseDown) return;
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseX = t.clientX;
      this.mouseY = t.clientY;
      const dx = this.mouseX - this.prevMouseX;
      const dy = this.mouseY - this.prevMouseY;
      this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
    };

    this._onTouchEnd = () => {
      this.mouseDown = false;
      this.mouseSpeed = 0;
    };
  }

  // ——— Public API ———

  setLetters(letters: { char: string; x: number; y: number; font: string }[]) {
    this.letters = letters.map((l) => ({
      char: l.char,
      ox: l.x,
      oy: l.y,
      x: l.x,
      y: l.y,
      vx: 0,
      vy: 0,
      font: l.font,
    }));
  }

  setColorScheme(isDark: boolean) {
    this.buildColorPalette(isDark);
    this.bgColor = isDark ? 'rgb(2,8,20)' : 'rgb(255,254,250)';
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    const ww = Math.ceil(w / WATER_SCALE);
    const wh = Math.ceil(h / WATER_SCALE);
    this.water = new WaterCaustics(ww, wh);
    this.water.waterScale = WATER_SCALE;
    this.water.noiseScale = PARAMS.noiseScale;
    this.water.timeSpeed = PARAMS.timeSpeed * 0.001;
    this.water.sharpness = PARAMS.sharpness;
    this.water.rippleAmplitude = PARAMS.rippleAmplitude;
    this.water.rippleWavelength = PARAMS.rippleWavelength;
    this.water.rippleDecay = PARAMS.rippleDecay * 0.001;
    this.water.waveCenterY = PARAMS.waveCenterY;
    this.water.waveAmpMul = PARAMS.waveAmpMul;
  }

  start() {
    // Always stop first to ensure clean state
    if (this.running) this.stop();
    this.running = true;

    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('touchstart', this._onTouchStart, {
      passive: true,
    });
    this.canvas.addEventListener('touchmove', this._onTouchMove, {
      passive: true,
    });
    window.addEventListener('touchend', this._onTouchEnd);

    const loop = (time: number) => {
      if (!this.running) return;
      this.lastFrameTime = time;

      // FPS calculation
      this.fpsFrames++;
      if (time - this.fpsLastTime >= 1000) {
        this.fpsDisplay = this.fpsFrames;
        this.fpsFrames = 0;
        this.fpsLastTime = time;
      }

      this.emitRipples(time);
      this.updatePhysics(time);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;

    // Reset mouse/touch state
    this.mouseDown = false;
    this.mouseSpeed = 0;

    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
  }

  // ——— Private methods ———

  private buildColorPalette(isDark: boolean) {
    this.bucketColors = [];
    for (let i = 0; i < COLOR_BUCKETS; i++) {
      const t = i / (COLOR_BUCKETS - 1);
      if (isDark) {
        // Night: bright white text
        const r = Math.round(225 + t * 30); // 225..255
        const g = Math.round(228 + t * 27); // 228..255
        const b = Math.round(232 + t * 23); // 232..255
        const alpha = (0.85 + t * 0.15).toFixed(2);
        this.bucketColors.push(`rgba(${r}, ${g}, ${b}, ${alpha})`);
      } else {
        // Day: black text, slightly lighter when displaced
        const v = Math.round(50 - t * 40); // 50..10
        const alpha = (0.75 + t * 0.25).toFixed(2);
        this.bucketColors.push(`rgba(${v}, ${v}, ${v}, ${alpha})`);
      }
    }
  }

  // No glyph cache — render directly with fillText for reliability

  private emitRipples(time: number) {
    if (!this.mouseDown) return;

    const stationaryInterval = PARAMS.rippleWavelength;
    const movingInterval = PARAMS.rippleInterval;
    const moveFactor = Math.min(this.mouseSpeed * 0.1, 1.0);
    const interval =
      stationaryInterval * (1 - moveFactor) + movingInterval * moveFactor;

    if (time - this.lastRippleTime >= interval) {
      this.lastRippleTime = time;
      this.water.addRipple(this.mouseX, this.mouseY, time);
    }
    this.mouseSpeed *= 0.85;
  }

  private updatePhysics(time: number) {
    this.water.update(time);
    this.water.pruneRipples(time);

    const invWaterScale = 1 / WATER_SCALE;

    for (const letter of this.letters) {
      const wx = letter.x * invWaterScale;
      const wy = letter.y * invWaterScale;

      const brightness = this.water.sample(wx, wy);
      const clampedWx =
        wx < 0 ? 0 : wx >= this.water.width ? this.water.width - 1 : wx;
      const clampedWy =
        wy < 0 ? 0 : wy >= this.water.height ? this.water.height - 1 : wy;
      const [gx, gy] = this.water.sampleGradient(clampedWx, clampedWy);

      // Water gradient force: push letters along caustic gradients
      const forceMag = brightness * brightness;
      letter.vx -= gx * PARAMS.gradientForce * forceMag * DT;
      letter.vy -= gy * PARAMS.gradientForce * forceMag * DT;

      // Ripple push force: carry letters with expanding wave rings
      let rippleInfluence = 0;
      for (let ri = 0; ri < this.water.ripples.length; ri++) {
        const ripple = this.water.ripples[ri];
        const rdx = letter.x - ripple.cx;
        const rdy = letter.y - ripple.cy;
        const distSq = rdx * rdx + rdy * rdy;
        if (distSq < 1) continue;

        const dist = Math.sqrt(distSq);
        const delta = dist - ripple._radius;
        const rw = ripple._ringWidth;

        const range = rw * 3;
        if (delta > range || delta < -range) continue;

        const snap = -delta / rw;
        const normDelta = delta / rw;
        const proximity = Math.exp(-normDelta * normDelta);

        const behindFront =
          delta < 0 ? Math.exp(delta / rw) : Math.exp((-delta * 2) / rw);

        const snapForce = snap * proximity * PARAMS.rippleForce * 1.5;
        const pushForce =
          behindFront * PARAMS.rippleForce * ripple._baseSpeed * 0.8;
        const totalForce =
          (snapForce + pushForce) * ripple._timeFade * ripple.amplitude;

        const invDist = 1 / dist;
        letter.vx += rdx * invDist * totalForce * DT;
        letter.vy += rdy * invDist * totalForce * DT;

        rippleInfluence = Math.max(
          rippleInfluence,
          proximity * ripple._timeFade,
        );
      }

      // Spring restoration: pull letters back to original positions
      const dx = letter.ox - letter.x;
      const dy = letter.oy - letter.y;
      const darkness = 1.0 - brightness;
      const rippleDampen = 1.0 - rippleInfluence * 0.85;
      const springStrength =
        (PARAMS.springForce + darkness * PARAMS.darkSpringBoost) * rippleDampen;

      letter.vx += dx * springStrength * DT;
      letter.vy += dy * springStrength * DT;

      // Damping and integration
      letter.vx *= PARAMS.damping;
      letter.vy *= PARAMS.damping;
      letter.x += letter.vx * DT;
      letter.y += letter.vy * DT;

      // Max displacement constraint
      const ddx = letter.x - letter.ox;
      const ddy = letter.y - letter.oy;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist > PARAMS.maxDisplacement) {
        const scale = PARAMS.maxDisplacement / dist;
        letter.x = letter.ox + ddx * scale;
        letter.y = letter.oy + ddy * scale;
        letter.vx *= 0.5;
        letter.vy *= 0.5;
      }
    }
  }

  private render() {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, W, H);

    const invMax = 1 / PARAMS.maxDisplacement;
    const bucketScale = COLOR_BUCKETS - 1;

    ctx.textBaseline = 'alphabetic';
    let lastFont = '';

    for (let i = 0; i < this.letters.length; i++) {
      const letter = this.letters[i];
      const dx = letter.x - letter.ox;
      const dy = letter.y - letter.oy;
      const distSq = dx * dx + dy * dy;
      const t = Math.min(Math.sqrt(distSq) * invMax, 1);
      const bucket = (t * bucketScale + 0.5) | 0;

      // Only set font when it changes (sorted letters help, but even unsorted this is fast)
      if (letter.font !== lastFont) {
        ctx.font = letter.font;
        lastFont = letter.font;
      }
      ctx.fillStyle = this.bucketColors[bucket];
      ctx.fillText(letter.char, letter.x, letter.y);
    }

    // FPS counter — bottom left
    ctx.font = '11px monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle =
      this.bgColor === 'rgb(2,8,20)'
        ? 'rgba(100,180,255,0.4)'
        : 'rgba(0,0,0,0.25)';
    const fpsText = `${this.fpsDisplay} fps | ${this.letters.length} chars | ${this.water.ripples.length} ripples`;
    const fpsWidth = ctx.measureText(fpsText).width;
    ctx.fillText(fpsText, W - fpsWidth - 10, H - 10);
  }
}
