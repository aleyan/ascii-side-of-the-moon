import type { MoonState, RenderOptions } from "../core/types";
import moonData from "./ascii.json";

/** Fixed output size (height=20, width=48). */
export const FRAME_W = 60;
export const FRAME_H = 27;

/** Clamp helper */
export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Phase angle + waxing/waning → sun vector in camera plane. */
export function phaseSunVector(phaseAngleDeg: number, isWaxing?: boolean) {
  const a = (phaseAngleDeg * Math.PI) / 180;
  // α=0 full, α=180 new. If waxing: bright on right → sx > 0; if waning: sx < 0.
  const sign = isWaxing ? 1 : -1;
  const sx = sign * Math.sin(a);
  const sz = Math.cos(a);
  return { sx, sz };
}

/** Lambertian intensity; returns 0..1 (no grayscale used in final, but handy for tests). */
export function litIntensity(xn: number, yn: number, sx: number, sz: number) {
  const rsq = xn * xn + yn * yn;
  if (rsq > 1) return 0;
  const nz = Math.sqrt(Math.max(0, 1 - rsq));
  return Math.max(0, xn * sx + nz * sz);
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
 * Render a 20×48 moon using pre-rendered ASCII art.
 * - Uses nearest pre-rendered moon for distance and libration
 * - Applies phase masking to show the illuminated portion
 */
export function renderMoon(state: MoonState, _options: RenderOptions = {}): string {
  // Find the best matching pre-rendered moon
  const nearestMoon = findNearestMoonState(state);
  const asciiLines = nearestMoon.ascii.split("\n");

  // Get phase vector for masking
  const { sx, sz } = phaseSunVector(state.phase.phaseAngleDeg, state.phase.isWaxing);

  const out: string[] = [];
  const r01 = 1.0; // Unit circle for phase calculations

  for (let iy = 0; iy < FRAME_H; iy++) {
    const y = -r01 + ((iy + 0.5) / FRAME_H) * (2 * r01);
    let row = "";

    for (let ix = 0; ix < FRAME_W; ix++) {
      const x = -r01 + ((ix + 0.5) / FRAME_W) * (2 * r01);
      const xn = x / r01;
      const yn = y / r01;

      // Check if point is within the unit disc
      const r2 = xn * xn + yn * yn;
      if (r2 > 1) {
        row += " ";
        continue;
      }

      // Apply phase masking
      const I = litIntensity(xn, yn, sx, sz);
      if (I <= 0) {
        row += " ";
        continue;
      }

      // Use the pre-rendered ASCII art, replacing with space if in shadow
      row += asciiLines[iy]?.[ix] ?? " ";
    }

    out.push(row);
  }

  return out.join("\n");
}