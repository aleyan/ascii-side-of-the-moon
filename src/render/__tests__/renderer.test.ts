import { describe, it, expect } from 'vitest';
import { 
  asciiMoonDim,
  FRAME_W,
  FRAME_H,
  phaseSunVector,
  litIntensity,
  renderMoon,
} from '../renderer';
import moonData from '../ascii.json';
import type { MoonState } from "../../core/types";

/** Helpers for tests */
function mkState(partial: Partial<MoonState>): MoonState {
  // Arrange: provide sane defaults and allow overrides for specific assertions.
  const base: MoonState = {
    date: new Date(0),
    phase: {
      phaseAngleDeg: 60,           // generic gibbous-ish angle
      illuminatedFraction: 0.75,   // arbitrary but consistent with gibbous
      isWaxing: false,
    },
    size: {
      distanceKm: 380_000,
      angularDiameterDeg: 0.5,
    },
    libration: {
      elon: 0,
      elat: 0,
    },
  };
  return {
    ...base,
    ...partial,
    phase: { ...base.phase, ...(partial.phase ?? {}) },
    size: { ...base.size, ...(partial.size ?? {}) },
    libration: { ...base.libration, ...(partial.libration ?? {}) },
  };
}

function litCountsBySide(frame: string) {
  // Count non-space characters as "lit" pixels in left vs right halves.
  const lines = frame.split("\n");
  let left = 0;
  let right = 0;
  const mid = Math.floor(FRAME_W / 2);
  for (const row of lines) {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]!;
      if (ch !== " ") {
        if (i < mid) left++;
        else right++;
      }
    }
  }
  return { left, right };
}

describe('asciiMoonDim', () => {
  it('should calculate moon dimensions within the frame', () => {
    // Get moons at different distances for testing
    const nearMoon = moonData.moons.find(m => m.distance_km < 362000)!; // Closest moon
    const farMoon = moonData.moons.find(m => m.distance_km > 404000)!; // Farthest moon
    
    const nearDim = asciiMoonDim(nearMoon.ascii);
    const farDim = asciiMoonDim(farMoon.ascii);
    
    // Both should be smaller than or equal to frame
    expect(nearDim.width).toBeLessThanOrEqual(FRAME_W);
    expect(nearDim.height).toBeLessThanOrEqual(FRAME_H);
    expect(farDim.width).toBeLessThan(FRAME_W);
    expect(farDim.height).toBeLessThan(FRAME_H);
    
    // Near moon should appear larger than far moon
    expect(nearDim.width).toBeGreaterThan(farDim.width);
    expect(nearDim.height).toBeGreaterThan(farDim.height);
  });

  it('should calculate centers relative to non-space content', () => {
    const moon = moonData.moons[0]!;
    const { centerX, centerY } = asciiMoonDim(moon.ascii);
    
    // Find actual content boundaries
    const lines = moon.ascii.split('\n');
    const nonEmptyLines = lines.filter(line => /\S/.test(line));
    const firstNonEmptyLine = lines.findIndex(line => /\S/.test(line));
    
    // Center Y should be relative to non-empty lines
    const contentHeight = nonEmptyLines.length;
    const expectedCenterY = firstNonEmptyLine + Math.floor(contentHeight / 2);
    expect(centerY).toBe(expectedCenterY);
    
    // Center should be in middle third of frame
    expect(centerX).toBeGreaterThan(FRAME_W / 3);
    expect(centerX).toBeLessThan(2 * FRAME_W / 3);
    expect(centerY).toBeGreaterThan(FRAME_H / 3);
    expect(centerY).toBeLessThan(2 * FRAME_H / 3);
  });

  it('should handle empty or all-space input', () => {
    const emptyArt = '';
    const allSpaceArt = '    \n    \n    ';
    
    const empty = asciiMoonDim(emptyArt);
    const allSpace = asciiMoonDim(allSpaceArt);
    
    // Should return frame dimensions for empty/space-only input
    expect(empty).toEqual({
      width: FRAME_W,
      height: FRAME_H,
      centerX: Math.floor(FRAME_W / 2),
      centerY: Math.floor(FRAME_H / 2)
    });
    
    expect(allSpace).toEqual({
      width: FRAME_W,
      height: FRAME_H,
      centerX: Math.floor(FRAME_W / 2),
      centerY: Math.floor(FRAME_H / 2)
    });
  });
});

describe("phaseSunVector()", () => {
  it("includes vertical component based on latitude libration", () => {
    // Arrange
    const phaseAngle = 90; // quarter moon
    const elat = 5.0; // significant latitude libration
    
    // Act
    const { sx, sy, sz } = phaseSunVector(phaseAngle, true, elat);
    
    // Assert
    // For positive elat, sun should appear above horizon (sy < 0)
    expect(sy).toBeLessThan(0);
    // Vector should be normalized
    const magnitude = Math.sqrt(sx * sx + sy * sy + sz * sz);
    expect(magnitude).toBeCloseTo(1, 6);
  });
  it("uses waxing to orient bright limb to the right", () => {
    // Arrange
    const a = 60; // degrees
    // Act
    const { sx: sxWax, sz: szWax } = phaseSunVector(a, true);
    const { sx: sxWane, sz: szWane } = phaseSunVector(a, false);
    // Assert
    expect(szWax).toBeCloseTo(szWane, 6); // cos term same magnitude
    expect(sxWax).toBeGreaterThan(0);     // waxing -> right-side bright
    expect(sxWane).toBeLessThan(0);       // waning -> left-side bright
  });

  it("α=0° points fully front (sz=1), independent of waxing", () => {
    // Arrange
    const a = 0;
    // Act
    const w = phaseSunVector(a, true);
    const n = phaseSunVector(a, false);
    // Assert
    expect(w.sx).toBeCloseTo(0, 6);
    expect(n.sx).toBeCloseTo(0, 6);
    expect(w.sz).toBeCloseTo(1, 6);
    expect(n.sz).toBeCloseTo(1, 6);
  });
});

describe("litIntensity()", () => {
  it("detects thin crescents with partial character illumination", () => {
    // Arrange
    const nearNewMoon = 170; // Very thin crescent
    const { sx, sy, sz } = phaseSunVector(nearNewMoon, true);
    
    // Test a point near the limb where crescent should be visible
    const x = 0.99; // Just inside the edge
    const y = 0;
    
    // Act
    const I = litIntensity(x, y, sx, sy, sz);
    
    // Assert
    // Should detect the thin crescent due to multi-sampling
    expect(I).toBeGreaterThan(0);
  });
  it("center is fully lit at full moon", () => {
    // Arrange
    const xn = 0, yn = 0;
    const { sx, sy, sz } = phaseSunVector(0, true); // full moon
    // Act
    const I = litIntensity(xn, yn, sx, sy, sz);
    // Assert
    expect(I).toBeCloseTo(1, 3);
  });

  it("edge is unlit at new moon", () => {
    // Arrange
    const { sx, sy, sz } = phaseSunVector(180, true); // new moon orientation irrelevant
    const slightlyInside = 0.999;
    // Act
    const I = litIntensity(slightlyInside, 0, sx, sy, sz);
    // Assert
    expect(I).toBeCloseTo(0, 3);
  });
});

describe("renderMoon()", () => {
  it("adjusts phase mask size based on moon's apparent size", () => {
    // Arrange
    const phase = { phaseAngleDeg: 90, illuminatedFraction: 0.5, isWaxing: true };
    
    // Test with two different distances
    const nearMoon = mkState({ 
      phase,
      size: { distanceKm: 363300, angularDiameterDeg: 0.5 } // Near perigee
    });
    const farMoon = mkState({ 
      phase,
      size: { distanceKm: 405500, angularDiameterDeg: 0.5 } // Near apogee
    });

    // Act
    const nearResult = renderMoon(nearMoon);
    const farResult = renderMoon(farMoon);

    // Count non-space characters to compare apparent sizes
    const countNonSpace = (str: string) => str.replace(/\s/g, '').length;
    const nearSize = countNonSpace(nearResult);
    const farSize = countNonSpace(farResult);

    // Assert
    // Moon should appear larger when closer
    expect(nearSize).toBeGreaterThan(farSize);
  });
  it("returns fixed dimensions", () => {
    // Arrange
    const state = mkState({});
    // Act
    const frame = renderMoon(state);
    // Assert
    const rows = frame.split("\n");
    expect(rows).toHaveLength(FRAME_H);
    for (const row of rows) {
      expect(row.length).toBe(FRAME_W);
    }
  });

  it("waning vs waxing flips left/right lit distribution (same angle)", () => {
    // Arrange
    const angle = 60; // same phase angle for both
    const waning = mkState({ phase: { phaseAngleDeg: angle, illuminatedFraction: 0.6, isWaxing: false } });
    const waxing = mkState({ phase: { phaseAngleDeg: angle, illuminatedFraction: 0.6, isWaxing: true } });

    // Act
    const waningFrame = renderMoon(waning);
    const waxingFrame = renderMoon(waxing);
    const waningCounts = litCountsBySide(waningFrame);
    const waxingCounts = litCountsBySide(waxingFrame);

    // Assert
    // Waning -> bright limb on LEFT
    expect(waningCounts.left).toBeGreaterThan(waningCounts.right);
    // Waxing -> bright limb on RIGHT
    expect(waxingCounts.right).toBeGreaterThan(waxingCounts.left);
  });

  it("libration affects horizontal domain predictably", () => {
    // Arrange
    const base = mkState({ phase: { isWaxing: true, phaseAngleDeg: 0, illuminatedFraction: 1.0 } });

    // Positive elon trims left; negative trims right.
    const pos = mkState({ ...base, libration: { elon: +10, elat: 0 } });
    const neg = mkState({ ...base, libration: { elon: -10, elat: 0 } });

    // Act
    const posFrame = renderMoon(pos);
    const negFrame = renderMoon(neg);

    // Count lit characters in the first/last few columns to detect trimming bias.
    const firstCols = (s: string, n: number) =>
      s.split("\n").reduce((acc, row) => acc + [...row.slice(0, n)].filter(c => c !== " ").length, 0);
    const lastCols = (s: string, n: number) =>
      s.split("\n").reduce((acc, row) => acc + [...row.slice(-n)].filter(c => c !== " ").length, 0);

    // Assert
    const N = 4;
    // If we trimmed left (positive elon), expect fewer lit chars near the far left edge.
    expect(firstCols(posFrame, N)).toBeLessThan(firstCols(renderMoon(base), N));
    // If we trimmed right (negative elon), expect fewer lit chars near the far right edge.
    expect(lastCols(negFrame, N)).toBeLessThan(lastCols(renderMoon(base), N));
  });
});
