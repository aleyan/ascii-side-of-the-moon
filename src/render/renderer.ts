import type { MoonState, RenderOptions, MoonAsciiDimensions } from "../core/types";
import moonData from "./ascii.json";

/** 
 * Fixed frame size in characters.
 * Width: 60 characters
 * Height: 29 characters
 * Characters have a 10:22 width:height aspect ratio, meaning each character
 * is roughly twice as tall as it is wide. This affects how we calculate
 * circular shapes like the moon's phase.
 */
export const FRAME_W = 60; // characters
export const FRAME_H = 29; // characters

/**
 * Calculate dimensions and center point of ASCII moon art by finding non-space boundaries.
 * All measurements are in character units.
 * 
 * This is used for phase calculations to:
 * 1. Find the actual moon size (excluding padding) which varies with distance
 * 2. Locate the exact center for phase angle calculations
 * 3. Determine the moon's radius in character units for phase masking
 */
export function asciiMoonDim(asciiArt: string): MoonAsciiDimensions {
  const lines = asciiArt.split('\n');
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  // Find boundaries of non-space characters
  lines.forEach((line, y) => {
    const firstNonSpace = line.search(/\S/);
    if (firstNonSpace !== -1) {
      const lastNonSpace = line.search(/\s+$/);
      minX = Math.min(minX, firstNonSpace);
      maxX = Math.max(maxX, lastNonSpace === -1 ? line.length - 1 : lastNonSpace - 1);
      if (minY === Infinity) minY = y;
      maxY = y;
    }
  });

  // If no non-space characters found, return frame dimensions
  if (minX === Infinity) {
    return {
      width: FRAME_W,
      height: FRAME_H,
      centerX: Math.floor(FRAME_W / 2),
      centerY: Math.floor(FRAME_H / 2)
    };
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  return {
    width: width,
    height: height,
    centerX: minX + Math.floor(width / 2),
    centerY: minY + Math.floor(height / 2)
  };
}

/** Clamp helper */
export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Convert degrees to radians. */
function rad(d: number): number {
  return (d * Math.PI) / 180;
}

/** 
 * Calculate sun vector in camera plane based on phase angle, waxing/waning state, and libration.
 * @param phaseAngleDeg - Phase angle in degrees (0° = full, 180° = new)
 * @param isWaxing - If true, bright limb is on right; if false, on left
 * @param elatDeg - Libration in latitude (degrees). Positive tilts terminator up-right.
 * @returns Normalized sun vector {sx, sy, sz} in camera space
 */
export function phaseSunVector(phaseAngleDeg: number, isWaxing?: boolean, elatDeg: number = 0) {
  const a = rad(phaseAngleDeg);
  const elat = rad(elatDeg);
  
  // Base vector in xz-plane (α=0 full, α=180 new)
  const sign = isWaxing ? 1 : -1;
  const sx = sign * Math.sin(a);
  let sy = 0;
  let sz = Math.cos(a);
  
  // Rotate around x-axis by latitude libration
  // This tilts the terminator line by moving some of sz into sy
  const sy1 = -sz * Math.sin(elat);
  const sz1 =  sz * Math.cos(elat);
  sy = sy1;
  sz = sz1;
  
  // Normalize the vector
  const mag = Math.sqrt(sx * sx + sy * sy + sz * sz);
  return { 
    sx: sx / mag,
    sy: sy / mag,
    sz: sz / mag
  };
}

/** 
 * Calculate Lambertian lighting intensity across a character's area using multi-sampling.
 * Each character is sampled at multiple points and the results are averaged.
 * This helps catch thin crescents that might only partially illuminate a character.
 * 
 * IMPORTANT: No hard threshold here; we return the true average in [0,1].
 * Very thin crescents will produce small but positive intensities.
 *
 * @param xn - Normalized x coordinate of character center (-1 to 1)
 * @param yn - Normalized y coordinate of character center (-1 to 1)
 * @param sx - Sun vector x component
 * @param sy - Sun vector y component
 * @param sz - Sun vector z component
 * @returns Average intensity from 0 to 1
 */
export function litIntensity(xn: number, yn: number, sx: number, sy: number, sz: number) {
  // Size of a character in normalized coordinates
  const dx = 1.0 / FRAME_W;
  const dy = 1.0 / FRAME_H;

  // Denser 5x5 grid catches sub-character crescents better than 3x3
  const offsets = [-0.5, -0.25, 0, 0.25, 0.5];

  let total = 0;
  let samples = 0;

  for (const ox of offsets) {
    for (const oy of offsets) {
      const x = xn + ox * dx;
      const y = yn + oy * dy;
      const rsq = x * x + y * y;
      if (rsq > 1) continue; // outside the disc

      const nz = Math.sqrt(Math.max(0, 1 - rsq));
      const dot = x * sx + y * sy + nz * sz; // n·s
      total += Math.max(0, dot);
      samples++;
    }
  }

  if (samples === 0) return 0;
  return total / samples;
}

/** Find the nearest moon state from our pre-rendered set */
function findNearestMoonState(state: MoonState) {
  // Weight distance more heavily since its range is much larger
  const DISTANCE_WEIGHT = 1.0;
  const LIBRATION_WEIGHT = 10000.0; // Scale up libration to make it more comparable to distance

  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < moonData.moons.length; i++) {
    const moon = moonData.moons[i];
    const distDiff = Math.abs(moon.distance_km - state.size.distanceKm) * DISTANCE_WEIGHT;
    const elatDiff = Math.abs(moon.libration_elat - state.libration.elat) * LIBRATION_WEIGHT;
    const elonDiff = Math.abs(moon.libration_elon - state.libration.elon) * LIBRATION_WEIGHT;
    
    const totalDiff = distDiff + elatDiff + elonDiff;
    if (totalDiff < bestDistance) {
      bestDistance = totalDiff;
      bestIndex = i;
    }
  }

  return moonData.moons[bestIndex];
}

/**
 * Render a 60×29 moon using pre-rendered ASCII art.
 * - Uses nearest pre-rendered moon for distance and libration
 * - Applies phase masking via Lambertian lighting
 * - Fallback: if nothing lights up (ultra-thin crescent), select the top
 *   illuminatedFraction of disc cells by raw incidence (n·s) to force a sliver.
 */
export function renderMoon(state: MoonState, _options: RenderOptions = {}): string {
  // Find the best matching pre-rendered moon
  const nearestMoon = findNearestMoonState(state);
  const asciiLines = nearestMoon.ascii.split("\n");

  // Calculate actual moon dimensions from the ASCII art
  const dim = asciiMoonDim(nearestMoon.ascii);
  
  // Sun vector for the given state
  const { sx, sy, sz } = phaseSunVector(
    state.phase.phaseAngleDeg,
    state.phase.isWaxing,
    state.libration.elat
  );

  // First pass: compute intensity map, raw incidence, and disc mask
  const intens: number[][] = Array.from({ length: FRAME_H }, () => Array(FRAME_W).fill(0));
  const rawInc: number[][] = Array.from({ length: FRAME_H }, () => Array(FRAME_W).fill(-1));
  const inDisc: boolean[][] = Array.from({ length: FRAME_H }, () => Array(FRAME_W).fill(false));

  let discCells = 0;
  let litCells = 0;

  for (let iy = 0; iy < FRAME_H; iy++) {
    for (let ix = 0; ix < FRAME_W; ix++) {
      // Convert frame coordinates to moon-relative normalized coordinates
      const moonX = ix - dim.centerX;
      const moonY = iy - dim.centerY;
      const xn = moonX / (dim.width / 2);
      const yn = moonY / (dim.height / 2);

      const r2 = xn * xn + yn * yn;
      if (r2 > 1) {
        intens[iy][ix] = 0;
        rawInc[iy][ix] = -1;
        continue;
      }

      inDisc[iy][ix] = true;
      discCells++;

      // Lambertian intensity (averaged over cell)
      const I = litIntensity(xn, yn, sx, sy, sz);
      intens[iy][ix] = I;
      if (I > 0) litCells++;

      // Raw incidence at the cell center (useful for ranked fallback)
      const nz = Math.sqrt(Math.max(0, 1 - r2));
      rawInc[iy][ix] = xn * sx + yn * sy + nz * sz; // may be negative
    }
  }

  // Decide which cells are "lit"
  const litMask: boolean[][] = Array.from({ length: FRAME_H }, () => Array(FRAME_W).fill(false));

  if (litCells > 0) {
    // Normal case: any cell with positive average intensity counts as lit.
    for (let iy = 0; iy < FRAME_H; iy++) {
      for (let ix = 0; ix < FRAME_W; ix++) {
        litMask[iy][ix] = intens[iy][ix] > 0;
      }
    }
  } else {
    // Fallback for ultra-thin crescents: rank by raw incidence.
    // Target number of lit cells proportional to illuminated fraction.
    const frac = clamp(state.phase.illuminatedFraction ?? 0, 0, 1);
    const target = Math.max(1, Math.round(frac * discCells));

    const candidates: Array<{ ix: number; iy: number; v: number }> = [];
    for (let iy = 0; iy < FRAME_H; iy++) {
      for (let ix = 0; ix < FRAME_W; ix++) {
        if (!inDisc[iy][ix]) continue;
        candidates.push({ ix, iy, v: rawInc[iy][ix] });
      }
    }
    // Sort descending by raw incidence (closest to the subsolar point)
    candidates.sort((a, b) => b.v - a.v);

    for (let k = 0; k < Math.min(target, candidates.length); k++) {
      const { ix, iy } = candidates[k]!;
      litMask[iy][ix] = true;
    }
  }

  // Second pass: compose the ASCII frame
  const out: string[] = [];
  for (let iy = 0; iy < FRAME_H; iy++) {
    let row = "";
    const src = asciiLines[iy] ?? "";
    for (let ix = 0; ix < FRAME_W; ix++) {
      if (litMask[iy][ix]) {
        row += src[ix] ?? " ";
      } else {
        row += " ";
      }
    }
    out.push(row);
  }

  return out.join("\n");
}