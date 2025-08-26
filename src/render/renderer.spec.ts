import { describe, it, expect } from "vitest";
import {
  FRAME_W,
  FRAME_H,
  distanceScale,
  trimDomain,
  phaseSunVector,
  isWithinDisc,
  litIntensity,
  renderMoon,
} from "./renderer";
import type { MoonState } from "../core/types";

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

describe("distanceScale()", () => {
  it("clamps to ~1.0 near perigee", () => {
    // Arrange
    const nearPerigee = 363_300;
    // Act
    const s = distanceScale(nearPerigee);
    // Assert
    expect(s).toBeGreaterThan(0.98);
    expect(s).toBeLessThanOrEqual(1.0);
  });

  it("shrinks near apogee and respects lower bound", () => {
    // Arrange
    const nearApogee = 405_500;
    // Act
    const s = distanceScale(nearApogee);
    // Assert (rough expectation ~0.896 with a small safety margin)
    expect(s).toBeGreaterThan(0.85);
    expect(s).toBeLessThan(0.95);
  });
});

describe("trimDomain()", () => {
  it("trims left side for positive elon", () => {
    // Arrange
    const r01 = 0.95;
    // Act
    const pos = trimDomain(8, r01);   // +8° -> trim left
    const zero = trimDomain(0, r01);
    // Assert
    expect(pos.xMin).toBeGreaterThan(zero.xMin);
    expect(pos.xMax).toBeCloseTo(zero.xMax, 6);
  });

  it("trims right side for negative elon", () => {
    // Arrange
    const r01 = 0.95;
    // Act
    const neg = trimDomain(-8, r01);  // -8° -> trim right
    const zero = trimDomain(0, r01);
    // Assert
    expect(neg.xMax).toBeLessThan(zero.xMax);
    expect(neg.xMin).toBeCloseTo(zero.xMin, 6);
  });
});

describe("phaseSunVector()", () => {
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

describe("isWithinDisc() & litIntensity()", () => {
  it("center is inside disc and fully lit at full moon", () => {
    // Arrange
    const xn = 0, yn = 0;
    const { sx, sz } = phaseSunVector(0, true); // full moon
    // Act
    const inside = isWithinDisc(xn, yn);
    const I = litIntensity(xn, yn, sx, sz);
    // Assert
    expect(inside).toBe(true);
    expect(I).toBeCloseTo(1, 3);
  });

  it("edge is inside disc but terminator is unlit at new moon", () => {
    // Arrange
    const { sx, sz } = phaseSunVector(180, true); // new moon orientation irrelevant
    const edgeX = 1, edgeY = 0; // on the rim after normalization
    const slightlyInside = 0.999;
    // Act
    const inside = isWithinDisc(slightlyInside, 0);
    const I = litIntensity(slightlyInside, 0, sx, sz);
    // Assert
    expect(inside).toBe(true);
    expect(I).toBeCloseTo(0, 3);
    // outside should be rejected
    expect(isWithinDisc(edgeX + 0.01, edgeY)).toBe(false);
  });
});

describe("renderMoon()", () => {
  it("returns fixed dimensions (20 rows × 48 columns)", () => {
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

  it("libration trimming affects horizontal domain predictably", () => {
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
    console.log("Base frame:\n" + renderMoon(base));
    console.log("\nPos frame:\n" + posFrame);
    // If we trimmed left (positive elon), expect fewer lit chars near the far left edge.
    expect(firstCols(posFrame, N)).toBeLessThan(firstCols(renderMoon(base), N));
    // If we trimmed right (negative elon), expect fewer lit chars near the far right edge.
    expect(lastCols(negFrame, N)).toBeLessThan(lastCols(renderMoon(base), N));
  });
});