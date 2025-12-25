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
 * Texture orientation offset in degrees.
 * 
 * This compensates for the baseline orientation of the pre-rendered moon textures.
 * The moon textures were generated with a specific orientation that may not align
 * with celestial north. This offset rotates the texture to align with the standard
 * astronomical orientation (celestial north up) before applying the parallactic
 * angle transformation.
 * 
 * Value determined empirically by comparing rendered output with actual moon photos.
 */
export const TEXTURE_ORIENTATION_OFFSET = -45;

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
 * Calculate sun vector in the standard celestial reference frame.
 * 
 * Coordinate system (standard astronomical orientation):
 * - +X points to observer's RIGHT (celestial west when facing south in NH)
 * - +Y points DOWN (screen coordinates, toward celestial south)
 * - +Z points toward observer
 * 
 * The sun direction determines which part of the moon is illuminated.
 * This is calculated in the celestial frame (north up, east left) and the
 * result is later rotated along with the texture to the observer's frame.
 * 
 * @param phaseAngleDeg - Phase angle in degrees (0° = full, 180° = new)
 * @param brightLimbAngleDeg - Position angle of bright limb in degrees (0° = north, 90° = east, etc.)
 *                              If undefined, falls back to simplified waxing/waning assumption.
 * @param isWaxing - Fallback: if true, sun is west (270°); if false, east (90°). Used when brightLimbAngle unavailable.
 * @param elatDeg - Libration in latitude (degrees). Tilts the terminator.
 * @returns Normalized sun vector {sx, sy, sz} in celestial frame
 */
export function phaseSunVector(
  phaseAngleDeg: number,
  brightLimbAngleDeg?: number,
  isWaxing?: boolean,
  elatDeg: number = 0
) {
  const a = rad(phaseAngleDeg);
  const elat = rad(elatDeg);
  
  // Determine the angle from which the sun illuminates the moon.
  // If brightLimbAngle is provided, use it directly. Otherwise, fall back to the
  // simplified assumption that waxing = west (270°), waning = east (90°).
  let sunAngle: number;
  if (brightLimbAngleDeg !== undefined) {
    sunAngle = rad(brightLimbAngleDeg);
  } else {
    // Legacy fallback: waxing = 270° (west), waning = 90° (east)
    sunAngle = isWaxing ? rad(270) : rad(90);
  }
  
  // Convert position angle to sun direction in screen coordinates.
  // Position angle convention: 0° = north (up/-Y), 90° = east (left/-X), 
  //                            180° = south (down/+Y), 270° = west (right/+X)
  // In screen coords: +X = right, +Y = down
  // Direction to sun: dx = -sin(PA), dy = -cos(PA)
  const sunDirX = -Math.sin(sunAngle);  // -sin because east is -X
  const sunDirY = -Math.cos(sunAngle);  // -cos because north is -Y
  
  // Scale by phase angle: at full (0°) sun is behind viewer (sz=1),
  // at new (180°) sun is in front (sz=-1), at quarter (90°) sun is to the side
  const sx = sunDirX * Math.sin(a);
  let sy = sunDirY * Math.sin(a);
  let sz = Math.cos(a);
  
  // Apply latitude libration (tilts the terminator slightly)
  // Rotates the sun vector around the x-axis
  const sy1 = sy * Math.cos(elat) - sz * Math.sin(elat);
  const sz1 = sy * Math.sin(elat) + sz * Math.cos(elat);
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
 * Characters have a 10:22 width:height aspect ratio.
 * This means a vertical step is ~2.2x larger than a horizontal step in pixel space.
 */
const CHAR_ASPECT = 22 / 10;

/**
 * Rotates an ASCII image by a given angle in degrees (clockwise).
 * Uses reverse mapping (for each output pixel, find source) to avoid gaps.
 * Compensates for character aspect ratio (10:22) so rotation appears circular.
 * 
 * @param ascii - The input ASCII string
 * @param angleDeg - Rotation angle in degrees (clockwise positive)
 * @param centerX - Optional X coordinate of rotation center (defaults to frame center)
 * @param centerY - Optional Y coordinate of rotation center (defaults to frame center)
 * @returns Rotated ASCII string
 */
export function rotateCharacters(ascii: string, angleDeg: number, centerX?: number, centerY?: number): string {
  // Normalize angle
  const angle = ((angleDeg % 360) + 360) % 360;
  if (Math.abs(angle) < 0.1) return ascii;

  const lines = ascii.split('\n');
  const height = lines.length;
  const width = lines[0]?.length ?? 0;
  
  // Use provided center or default to frame center
  const cx = centerX ?? (width - 1) / 2;
  const cy = centerY ?? (height - 1) / 2;
  
  // Rotation in radians (clockwise in screen coords where +y is down)
  const rads = (angle * Math.PI) / 180;
  const cosA = Math.cos(rads);
  const sinA = Math.sin(rads);

  // Create output buffer
  const output: string[][] = Array.from({ length: height }, () => Array(width).fill(' '));
  
  // Reverse mapping: for each output pixel, find the source pixel
  for (let outY = 0; outY < height; outY++) {
    for (let outX = 0; outX < width; outX++) {
      // Convert output coordinates to centered space AND correct for aspect ratio
      // We treat X as the unit, so Y is scaled up
      const dx = outX - cx;
      const dy = (outY - cy) * CHAR_ASPECT;
      
      // Rotate backwards (inverse rotation) to find source position
      // Forward: x' = x*cos + y*sin, y' = -x*sin + y*cos
      // Inverse: x = x'*cos - y'*sin, y = x'*sin + y'*cos
      const srcDx = dx * cosA - dy * sinA;
      const srcDy = dx * sinA + dy * cosA;
      
      // Convert back to screen coordinates (un-correct aspect ratio)
      const srcX = Math.round(srcDx + cx);
      const srcY = Math.round((srcDy / CHAR_ASPECT) + cy);
      
      // Sample from source if in bounds
      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const char = lines[srcY]?.[srcX] ?? ' ';
        output[outY][outX] = char;
      }
    }
  }

  return output.map(row => row.join('')).join('\n');
}

/**
 * Render a 60×29 moon using pre-rendered ASCII art.
 * 
 * Algorithm:
 * 1. Select the nearest pre-rendered moon texture (based on distance and libration)
 * 2. Calculate sun direction in CELESTIAL frame (standard north-up orientation)
 * 3. Apply Lambertian phase lighting to create illumination mask (in celestial frame)
 * 4. Combine texture with phase mask (both in celestial frame)
 * 5. Rotate the COMBINED result by parallactic angle to match observer's view
 * 6. Optionally overlay horizon line
 * 
 * Key insight: The phase illumination is a property of the moon itself (which physical
 * areas are lit by the sun). When we rotate the moon's appearance for the observer,
 * the illuminated areas rotate WITH the texture because they're physically attached
 * to the lunar surface.
 */
export function renderMoon(state: MoonState, _options: RenderOptions = {}): string {
  const options = _options ?? {};
  const showHorizon = options.showHorizon !== false;
  
  // Find the best matching pre-rendered moon
  const nearestMoon = findNearestMoonState(state);
  const asciiLines = nearestMoon.ascii.split("\n");

  // Calculate actual moon dimensions from the ASCII art
  const dim = asciiMoonDim(nearestMoon.ascii);
  
  // Sun vector in CELESTIAL frame (north up, standard orientation)
  // This determines which part of the moon is illuminated.
  // The brightLimbAngle gives the exact direction from moon to sun,
  // producing accurate terminator orientation for any date.
  const { sx, sy, sz } = phaseSunVector(
    state.phase.phaseAngleDeg,
    state.phase.brightLimbAngle,
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

  // Compose the ASCII frame in CELESTIAL orientation (texture + phase mask)
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

  let composed = out.join("\n");

  // Apply parallactic angle rotation to match the observer's view.
  //
  // The composed image is in the celestial frame with north "up". The observer sees
  // the moon with zenith "up". The parallactic angle (q) measures the angular distance
  // from zenith to celestial north, going eastward:
  //   - q > 0: celestial north is east of zenith
  //   - q < 0: celestial north is west of zenith
  //
  // To transform from "north up" to "zenith up", we rotate counter-clockwise by q,
  // which is equivalent to rotating clockwise by -q. The rotateCharacters function
  // uses clockwise-positive convention, so we pass -q.
  if (state.position?.parallacticAngle !== undefined) {
    const totalRotation = -state.position.parallacticAngle + TEXTURE_ORIENTATION_OFFSET;
    if (Math.abs(totalRotation) > 0.1) {
      composed = rotateCharacters(
        composed,
        totalRotation,
        dim.centerX,
        dim.centerY
      );
    }
  }

  return showHorizon ? overlayHorizon(composed, state, dim) : composed;
}

function overlayHorizon(art: string, state: MoonState, moonDim: MoonAsciiDimensions): string {
  const pos = state.position;
  if (!pos) return art;
  if (state.size.angularDiameterDeg <= 0) return art;

  const altitude = pos.altitude ?? 0;
  const radiusDeg = state.size.angularDiameterDeg / 2;
  const topAlt = altitude + radiusDeg;
  const bottomAlt = altitude - radiusDeg;

  // Fully above horizon
  if (bottomAlt >= 0) {
    return art;
  }

  const lines = art.split("\n");
  const degreesPerChar = state.size.angularDiameterDeg / Math.max(1, moonDim.height);
  let horizonRow = moonDim.centerY + altitude / degreesPerChar;
  horizonRow = Math.round(clamp(horizonRow, 0, FRAME_H - 1));

  let label: string;
  if (topAlt <= 0) {
    const below = Math.abs(altitude).toFixed(1).replace(/\.0$/, "");
    label = `${below}-deg-below-horizon`;
  } else {
    label = "horizon";
  }

  lines[horizonRow] = makeHorizonLine(label);
  return lines.join("\n");
}

function makeHorizonLine(label: string) {
  const normalized = label.trim().replace(/\s+/g, '-');
  let content = `--${normalized}--`;
  if (content.length > FRAME_W) {
    content = content.slice(0, FRAME_W);
  }
  if (content.length === FRAME_W) return content;

  const remaining = FRAME_W - content.length;
  const left = Math.floor(remaining / 2);
  const right = remaining - left;
  return "-".repeat(left) + content + "-".repeat(right);
}
