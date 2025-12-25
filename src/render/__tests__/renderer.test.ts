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
    // Arrange - use phase angle where sz != 0 so libration rotation has effect
    const phaseAngle = 60; // gibbous moon (sz = cos(60°) = 0.5)
    const elat = 5.0; // significant latitude libration
    
    // Act - use undefined for brightLimbAngle to test waxing fallback
    const { sx, sy, sz } = phaseSunVector(phaseAngle, undefined, true, elat);
    
    // Assert: libration should introduce a non-zero sy component
    expect(sy).not.toBeCloseTo(0, 3);
    // Vector should be normalized
    const magnitude = Math.sqrt(sx * sx + sy * sy + sz * sz);
    expect(magnitude).toBeCloseTo(1, 6);
  });

  it("uses waxing to orient bright limb to the right (fallback mode)", () => {
    // Arrange
    const a = 60; // degrees
    // Act - pass undefined for brightLimbAngle to use waxing fallback
    const { sx: sxWax, sz: szWax } = phaseSunVector(a, undefined, true);
    const { sx: sxWane, sz: szWane } = phaseSunVector(a, undefined, false);
    // Assert
    expect(szWax).toBeCloseTo(szWane, 6); // cos term same magnitude
    expect(sxWax).toBeGreaterThan(0);     // waxing -> right-side bright
    expect(sxWane).toBeLessThan(0);       // waning -> left-side bright
  });

  it("α=0° points fully front (sz=1), independent of waxing", () => {
    // Arrange
    const a = 0;
    // Act
    const w = phaseSunVector(a, undefined, true);
    const n = phaseSunVector(a, undefined, false);
    // Assert
    expect(w.sx).toBeCloseTo(0, 6);
    expect(n.sx).toBeCloseTo(0, 6);
    expect(w.sz).toBeCloseTo(1, 6);
    expect(n.sz).toBeCloseTo(1, 6);
  });

  it("uses brightLimbAngle when provided for accurate terminator orientation", () => {
    // Arrange: quarter moon with sun at 250° position angle (southwest)
    const phaseAngle = 90;
    const brightLimbAngle = 250; // Sun is southwest of moon
    
    // Act
    const { sx, sy, sz } = phaseSunVector(phaseAngle, brightLimbAngle);
    
    // Assert: sun direction should be toward southwest (positive X, positive Y)
    // At 250°: -sin(250°) ≈ 0.94, -cos(250°) ≈ 0.34
    expect(sx).toBeGreaterThan(0); // west component
    expect(sy).toBeGreaterThan(0); // south component
    expect(sz).toBeCloseTo(0, 1);  // quarter moon, sun at 90° from line of sight
  });
});

describe("litIntensity()", () => {
  it("detects thin crescents with partial character illumination", () => {
    // Arrange
    const nearNewMoon = 170; // Very thin crescent
    const { sx, sy, sz } = phaseSunVector(nearNewMoon, undefined, true);
    
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
    const { sx, sy, sz } = phaseSunVector(0, undefined, true); // full moon
    // Act
    const I = litIntensity(xn, yn, sx, sy, sz);
    // Assert
    expect(I).toBeCloseTo(1, 3);
  });

  it("edge is unlit at new moon", () => {
    // Arrange
    const { sx, sy, sz } = phaseSunVector(180, undefined, true); // new moon orientation irrelevant
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

  describe("parallactic angle rotation", () => {
    /**
     * Helper to find the centroid of lit pixels in a rendered frame.
     * Returns normalized coordinates where (0,0) is center, positive x is right, positive y is down.
     */
    function findLitCentroid(frame: string): { x: number; y: number } {
      const lines = frame.split("\n");
      let sumX = 0, sumY = 0, count = 0;
      const midX = FRAME_W / 2;
      const midY = FRAME_H / 2;
      
      for (let y = 0; y < lines.length; y++) {
        for (let x = 0; x < lines[y].length; x++) {
          if (lines[y][x] !== " ") {
            sumX += (x - midX);
            sumY += (y - midY);
            count++;
          }
        }
      }
      
      if (count === 0) return { x: 0, y: 0 };
      return { x: sumX / count, y: sumY / count };
    }

    it("applies only texture offset when parallactic angle is zero", () => {
      // Arrange: waxing crescent with parallactic angle = 0
      // With TEXTURE_ORIENTATION_OFFSET, even q=0 results in some rotation
      const stateZeroAngle = mkState({
        phase: { phaseAngleDeg: 120, illuminatedFraction: 0.3, isWaxing: true },
        position: { altitude: 45, azimuth: 180, parallacticAngle: 0 }
      });

      // Act
      const frame = renderMoon(stateZeroAngle);
      const centroid = findLitCentroid(frame);

      // Assert: crescent should still be predominantly on the right for waxing
      // (even with texture offset rotation, waxing crescent remains on right side)
      expect(centroid.x).toBeGreaterThan(0); // waxing = right side lit
    });

    it("rotates crescent position for positive parallactic angle", () => {
      // Arrange: waxing crescent with positive parallactic angle (typical for Southern Hemisphere)
      // Positive parallactic angle means celestial north is east of zenith.
      // We rotate by -q, so positive q causes counter-clockwise rotation of coordinates,
      // which moves the crescent clockwise (right → down).
      const stateNoRotation = mkState({
        phase: { phaseAngleDeg: 120, illuminatedFraction: 0.3, isWaxing: true },
        position: { altitude: 45, azimuth: 180, parallacticAngle: 0 }
      });
      const stateRotated = mkState({
        phase: { phaseAngleDeg: 120, illuminatedFraction: 0.3, isWaxing: true },
        position: { altitude: 45, azimuth: 180, parallacticAngle: 90 }
      });

      // Act
      const frameNoRotation = renderMoon(stateNoRotation);
      const frameRotated = renderMoon(stateRotated);
      const centroidNoRot = findLitCentroid(frameNoRotation);
      const centroidRot = findLitCentroid(frameRotated);

      // Assert: crescent moves from right toward bottom
      expect(centroidNoRot.x).toBeGreaterThan(0); // starts on right
      expect(centroidRot.y).toBeGreaterThan(centroidNoRot.y); // moves downward
    });

    it("rotates crescent position for negative parallactic angle", () => {
      // Arrange: waxing crescent with negative parallactic angle (typical for rising moon in NH)
      // Negative parallactic angle means celestial north is west of zenith.
      // We rotate by -q, so negative q causes clockwise rotation of coordinates,
      // which moves the crescent counter-clockwise (right → up).
      const stateNoRotation = mkState({
        phase: { phaseAngleDeg: 120, illuminatedFraction: 0.3, isWaxing: true },
        position: { altitude: 45, azimuth: 180, parallacticAngle: 0 }
      });
      const stateRotated = mkState({
        phase: { phaseAngleDeg: 120, illuminatedFraction: 0.3, isWaxing: true },
        position: { altitude: 45, azimuth: 180, parallacticAngle: -90 }
      });

      // Act
      const frameNoRotation = renderMoon(stateNoRotation);
      const frameRotated = renderMoon(stateRotated);
      const centroidNoRot = findLitCentroid(frameNoRotation);
      const centroidRot = findLitCentroid(frameRotated);

      // Assert: crescent moves from right toward top
      expect(centroidNoRot.x).toBeGreaterThan(0); // starts on right
      expect(centroidRot.y).toBeLessThan(centroidNoRot.y); // moves upward
    });

    it("rotates crescent by 180° for Southern Hemisphere-like parallactic angle", () => {
      // Arrange: waxing crescent, parallactic angle of ~180° flips the moon orientation
      const stateNoRotation = mkState({
        phase: { phaseAngleDeg: 120, illuminatedFraction: 0.3, isWaxing: true },
        position: { altitude: 45, azimuth: 180, parallacticAngle: 0 }
      });
      const stateFlipped = mkState({
        phase: { phaseAngleDeg: 120, illuminatedFraction: 0.3, isWaxing: true },
        position: { altitude: 45, azimuth: 180, parallacticAngle: 180 }
      });

      // Act
      const frameNoRotation = renderMoon(stateNoRotation);
      const frameFlipped = renderMoon(stateFlipped);
      const centroidNoRot = findLitCentroid(frameNoRotation);
      const centroidFlipped = findLitCentroid(frameFlipped);

      // Assert: with 180° parallactic angle (rotation by -180°),
      // the crescent should flip from right to left
      expect(centroidNoRot.x).toBeGreaterThan(0); // starts on right
      expect(centroidFlipped.x).toBeLessThan(0); // flips to left
    });
  });

  describe("horizon overlay", () => {
    const basePosition = { azimuth: 0, parallacticAngle: 0 };

    it("omits horizon line when moon fully above horizon", () => {
      const state = mkState({
        position: { ...basePosition, altitude: 5 }
      });
      const frame = renderMoon(state);
      expect(frame).not.toContain("deg-below-horizon");
      expect(frame).not.toContain("horizon--");
    });

    it("renders horizon line across frame when intersecting horizon", () => {
      const state = mkState({
        position: { ...basePosition, altitude: 0 }
      });
      const frame = renderMoon(state);
      expect(frame).not.toContain("deg-below-horizon");
      const horizonRow = frame.split("\n").find(line => line.includes("horizon"));
      expect(horizonRow).toBeTruthy();
      expect(horizonRow?.length).toBe(FRAME_W);
    });

    it("labels when moon is fully below horizon", () => {
      const state = mkState({
        position: { ...basePosition, altitude: -5 }
      });
      const frame = renderMoon(state);
      expect(frame).toContain("deg-below-horizon");
    });

    it("allows disabling the horizon overlay via render options", () => {
      const state = mkState({
        position: { ...basePosition, altitude: -5 }
      });
      const frame = renderMoon(state, { showHorizon: false });
      expect(frame).not.toContain("deg-below-horizon");
      expect(frame).not.toContain("horizon");
    });
  });
});
