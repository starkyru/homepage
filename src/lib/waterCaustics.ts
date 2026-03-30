// Procedural animated water caustics using layered simplex noise

// Simplex noise implementation
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

// Flatten grad vectors for cache-friendly access
const noiseGradX = [1, -1, 1, -1, 1, -1, 0, 0];
const noiseGradY = [1, 1, -1, -1, 0, 0, 1, -1];

const perm = new Uint8Array(512);
const permMod8 = new Uint8Array(512);

// Seed the permutation table
const p = new Uint8Array(256);
for (let i = 0; i < 256; i++) p[i] = i;
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [p[i], p[j]] = [p[j], p[i]];
}
for (let i = 0; i < 512; i++) {
  perm[i] = p[i & 255];
  permMod8[i] = perm[i] & 7; // bitwise mod 8
}

function simplex2(x: number, y: number): number {
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t);
  const y0 = y - (j - t);

  const i1 = x0 > y0 ? 1 : 0;
  const j1 = 1 - i1;

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;

  const ii = i & 255;
  const jj = j & 255;

  let n0 = 0,
    n1 = 0,
    n2 = 0;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    const gi = permMod8[ii + perm[jj]];
    n0 = t0 * t0 * (noiseGradX[gi] * x0 + noiseGradY[gi] * y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    const gi = permMod8[ii + i1 + perm[jj + j1]];
    n1 = t1 * t1 * (noiseGradX[gi] * x1 + noiseGradY[gi] * y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    const gi = permMod8[ii + 1 + perm[jj + 1]];
    n2 = t2 * t2 * (noiseGradX[gi] * x2 + noiseGradY[gi] * y2);
  }

  return 70 * (n0 + n1 + n2);
}

export interface Ripple {
  cx: number;
  cy: number;
  startTime: number;
  wavelength: number;
  amplitude: number;
  decay: number;
  // Cached per frame
  _radius: number;
  _timeFade: number;
  _ringWidth: number;
  _baseSpeed: number;
}

export class WaterCaustics {
  width: number;
  height: number;
  brightness: Float32Array;
  // Precomputed gradient buffers
  gradX: Float32Array;
  gradY: Float32Array;
  noiseScale = 0.004;
  timeSpeed = 0.0004;
  sharpness = 0.6;
  rippleAmplitude = 0.5;
  rippleWavelength = 500;
  rippleDecay = 0.0015;
  waterScale = 2;
  ripples: Ripple[] = [];
  waveCenterY = 0;
  waveAmpMul = 1.0;

  private frameCount = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.brightness = new Float32Array(width * height);
    this.gradX = new Float32Array(width * height);
    this.gradY = new Float32Array(width * height);
  }

  addRipple(x: number, y: number, time: number) {
    this.ripples.push({
      cx: x,
      cy: y,
      startTime: time,
      wavelength: this.rippleWavelength,
      amplitude: this.rippleAmplitude,
      decay: this.rippleDecay,
      _radius: 0,
      _timeFade: 1,
      _ringWidth: this.rippleWavelength * 0.15,
      _baseSpeed: this.rippleWavelength * 0.002,
    });
  }

  getRippleRadius(ripple: Ripple, time: number): number {
    const age = time - ripple.startTime;
    const baseSpeed = ripple._baseSpeed;
    const phase = (2 * Math.PI * age) / ripple.wavelength;
    const sineWave =
      (1 - Math.cos(phase + this.waveCenterY * Math.PI)) * this.waveAmpMul;
    const sineRadius = baseSpeed * age * 0.5 * sineWave;
    return baseSpeed * age * 0.3 + sineRadius * 0.7;
  }

  /** Cache per-ripple values once per frame so physics doesn't recompute */
  cacheRipples(time: number) {
    for (const r of this.ripples) {
      const age = time - r.startTime;
      r._radius = this.getRippleRadius(r, time);
      r._timeFade = Math.exp(-age * r.decay);
      r._ringWidth = r.wavelength * 0.15;
      r._baseSpeed = r.wavelength * 0.002;
    }
  }

  pruneRipples(_time: number) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if (this.ripples[i]._timeFade < 0.01) {
        this.ripples.splice(i, 1);
      }
    }
  }

  private computeRipplesWater(sx: number, sy: number): number {
    let total = 0;
    for (const r of this.ripples) {
      const dx = sx - r.cx;
      const dy = sy - r.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const rw = r._ringWidth;
      const delta = dist - r._radius;
      if (delta > rw * 3 || delta < -rw * 5) continue;

      const wave = Math.sin((delta * (2 * Math.PI)) / rw);
      const distFade = 1 / (1 + dist * 0.002);

      total += wave * r.amplitude * r._timeFade * distFade;
    }
    return total;
  }

  update(time: number) {
    this.frameCount++;
    this.cacheRipples(time);

    const { width, height, brightness } = this;
    const hasRipples = this.ripples.length > 0;

    // Only update noise every 2nd frame — it's smooth enough
    const updateNoise = (this.frameCount & 1) === 0;

    if (updateNoise) {
      const scale = this.noiseScale;
      const t = time * this.timeSpeed;
      const sharp = this.sharpness;
      const usePow = Math.abs(sharp - 1) > 0.01 && Math.abs(sharp - 0.5) > 0.01;
      const useSqrt = Math.abs(sharp - 0.5) < 0.01;

      const t07 = t * 0.7,
        t05 = t * 0.5;
      const t04 = t * 0.4,
        t03 = t * 0.3;
      const t02 = t * 0.2,
        t06 = t * 0.6;

      for (let y = 0; y < height; y++) {
        const ny = y * scale;
        const rowOff = y * width;
        for (let x = 0; x < width; x++) {
          const nx = x * scale;

          let v = 0;
          v += simplex2(nx + t07, ny + t05) * 0.5;
          v += simplex2(nx * 2 - t04, ny * 2 + t03) * 0.25;
          v += simplex2(nx * 4 + t02, ny * 4 - t06) * 0.125;

          v = v < 0 ? -v : v;
          if (useSqrt) {
            v = Math.sqrt(v);
          } else if (usePow) {
            v = Math.pow(v, sharp);
          }

          brightness[rowOff + x] = 1.0 - v;
        }
      }
    }

    // Apply ripples (always, since they change every frame)
    if (hasRipples) {
      const ws = this.waterScale;
      for (let y = 0; y < height; y++) {
        const rowOff = y * width;
        const sy = y * ws;
        for (let x = 0; x < width; x++) {
          const sx = x * ws;
          const rippleVal = this.computeRipplesWater(sx, sy);
          if (rippleVal !== 0) {
            let b = brightness[rowOff + x] + rippleVal;
            if (b < 0) b = 0;
            else if (b > 1) b = 1;
            brightness[rowOff + x] = b;
          }
        }
      }
    }

    this.computeGradients();
  }

  /** Precompute gradient for every pixel so physics can look up directly */
  private computeGradients() {
    const { width, height, brightness, gradX: gx, gradY: gy } = this;
    const inv4 = 0.25;

    for (let y = 0; y < height; y++) {
      const rowOff = y * width;
      const rowAbove = y > 1 ? (y - 2) * width : 0;
      const rowBelow = y < height - 2 ? (y + 2) * width : (height - 1) * width;

      for (let x = 0; x < width; x++) {
        const xm = x > 1 ? x - 2 : 0;
        const xp = x < width - 2 ? x + 2 : width - 1;

        gx[rowOff + x] =
          (brightness[rowOff + xp] - brightness[rowOff + xm]) * inv4;
        gy[rowOff + x] =
          (brightness[rowBelow + x] - brightness[rowAbove + x]) * inv4;
      }
    }
  }

  /** Sample brightness at fractional coordinates with bilinear interpolation */
  sample(x: number, y: number): number {
    const { width, brightness } = this;
    const w1 = width - 1.001;
    const h1 = this.height - 1.001;
    if (x < 0) x = 0;
    else if (x > w1) x = w1;
    if (y < 0) y = 0;
    else if (y > h1) y = h1;

    const ix = x | 0;
    const iy = y | 0;
    const fx = x - ix;
    const fy = y - iy;

    const i00 = iy * width + ix;
    const i10 = i00 + 1;
    const i01 = i00 + width;
    const i11 = i01 + 1;

    const fx1 = 1 - fx;
    const fy1 = 1 - fy;
    return (
      brightness[i00] * fx1 * fy1 +
      brightness[i10] * fx * fy1 +
      brightness[i01] * fx1 * fy +
      brightness[i11] * fx * fy
    );
  }

  /** Fast gradient lookup using precomputed buffers */
  private static _grad: [number, number] = [0, 0];
  sampleGradient(x: number, y: number): [number, number] {
    const idx = (y | 0) * this.width + (x | 0);
    const g = WaterCaustics._grad;
    g[0] = this.gradX[idx];
    g[1] = this.gradY[idx];
    return g;
  }
}
