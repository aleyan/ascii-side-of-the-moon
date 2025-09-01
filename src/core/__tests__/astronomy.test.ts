import { describe, it, expect } from 'vitest';
import { getMoonState, getMoonPhase } from "../astronomy";

describe("getMoonState", () => {
  // Test dates chosen for specific moon phases
  const FULL_MOON_DATE = new Date("2024-03-24"); // Known full moon
  const NEW_MOON_DATE = new Date("2024-03-10"); // Known new moon
  const WAXING_QUARTER_DATE = new Date("2024-03-17"); // First quarter
  const WANING_QUARTER_DATE = new Date("2024-04-02"); // Last quarter

  it("returns correct structure with all required fields", () => {
    const state = getMoonState(FULL_MOON_DATE);
    
    expect(state).toHaveProperty("date");
    expect(state).toHaveProperty("phase");
    expect(state.phase).toHaveProperty("phaseAngleDeg");
    expect(state.phase).toHaveProperty("illuminatedFraction");
    expect(state.phase).toHaveProperty("isWaxing");
    expect(state).toHaveProperty("size");
    expect(state.size).toHaveProperty("distanceKm");
    expect(state.size).toHaveProperty("angularDiameterDeg");
    expect(state).toHaveProperty("libration");
    expect(state.libration).toHaveProperty("elon");
    expect(state.libration).toHaveProperty("elat");
  });

  it("correctly identifies full moon phase", () => {
    const state = getMoonState(FULL_MOON_DATE);
    
    // For ASCII art, we're more lenient - full moon is roughly 0° ± 20°
    expect(Math.abs(state.phase.phaseAngleDeg)).toBeLessThan(20);
    expect(state.phase.illuminatedFraction).toBeGreaterThan(0.8); // Should be mostly illuminated
  });

  it("correctly identifies new moon phase", () => {
    const state = getMoonState(NEW_MOON_DATE);
    
    // For ASCII art, we're more lenient - new moon is roughly 180° ± 20°
    expect(Math.abs(state.phase.phaseAngleDeg - 180)).toBeLessThan(20);
    expect(state.phase.illuminatedFraction).toBeLessThan(0.2); // Should be mostly dark
  });

  it("correctly identifies waxing phase", () => {
    const state = getMoonState(WAXING_QUARTER_DATE);
    expect(state.phase.isWaxing).toBe(true);
    // For ASCII art, waxing quarter is roughly 90° ± 20°
    expect(Math.abs(state.phase.phaseAngleDeg - 90)).toBeLessThan(20);
    expect(state.phase.illuminatedFraction).toBeGreaterThan(0.3); // Should be partially illuminated
    expect(state.phase.illuminatedFraction).toBeLessThan(0.7);
  });

  it("correctly identifies waning phase", () => {
    const state = getMoonState(WANING_QUARTER_DATE);
    expect(state.phase.isWaxing).toBe(false);
    // For ASCII art, we just need to verify it's waning (not waxing)
    // The exact phase angle may vary based on the date chosen
    expect(Math.abs(state.phase.phaseAngleDeg - 90)).toBeLessThan(20);
    expect(state.phase.illuminatedFraction).toBeGreaterThan(0.3); // Should have some illumination
    expect(state.phase.illuminatedFraction).toBeLessThan(0.7); // But not full or new
  });

  it("returns reasonable values for physical parameters", () => {
    const state = getMoonState(FULL_MOON_DATE);
    
    // Distance should be within reasonable bounds (363,104 km to 405,696 km)
    expect(state.size.distanceKm).toBeGreaterThan(360000);
    expect(state.size.distanceKm).toBeLessThan(410000);
    
    // Angular diameter should be within reasonable bounds (29.3 to 34.1 arcminutes)
    expect(state.size.angularDiameterDeg).toBeGreaterThan(0.48); // 29.3/60
    expect(state.size.angularDiameterDeg).toBeLessThan(0.57); // 34.1/60
    
    // Libration should be within reasonable bounds (±7.7° latitude, ±7.9° longitude)
    expect(Math.abs(state.libration.elat)).toBeLessThan(8);
    expect(Math.abs(state.libration.elon)).toBeLessThan(8);
  });
});

describe("getMoonPhase", () => {
  function mk(angle: number, frac: number, waxing: boolean) {
    return {
      date: new Date(),
      phase: {
        phaseAngleDeg: angle,
        illuminatedFraction: frac,
        isWaxing: waxing
      },
      size: { distanceKm: 384400, angularDiameterDeg: 0.5 },
      libration: { elon: 0, elat: 0 }
    };
  }

  it("returns 'New Moon' near 180° (or very low illumination)", () => {
    expect(getMoonPhase(mk(180, 0.01, true))).toBe("New Moon");
    expect(getMoonPhase(mk(179, 0.01, false))).toBe("New Moon");
  });

  it("returns 'Full Moon' near 0° (or very high illumination)", () => {
    expect(getMoonPhase(mk(0, 0.99, false))).toBe("Full Moon");
    expect(getMoonPhase(mk(5, 0.985, true))).toBe("Full Moon");
  });

  it("returns 'First Quarter' at 90° when waxing", () => {
    expect(getMoonPhase(mk(90, 0.5, true))).toBe("First Quarter");
  });

  it("returns 'Last Quarter' at 90° when waning", () => {
    expect(getMoonPhase(mk(90, 0.5, false))).toBe("Last Quarter");
  });

  it("classifies 'Waxing Crescent' when angle > 90° and waxing", () => {
    expect(getMoonPhase(mk(120, 0.25, true))).toBe("Waxing Crescent");
    expect(getMoonPhase(mk(135, 0.15, true))).toBe("Waxing Crescent");
  });

  it("classifies 'Waning Crescent' when angle > 90° and waning", () => {
    expect(getMoonPhase(mk(120, 0.25, false))).toBe("Waning Crescent");
  });

  it("classifies 'Waxing Gibbous' when angle < 90° and waxing", () => {
    expect(getMoonPhase(mk(45, 0.75, true))).toBe("Waxing Gibbous");
  });

  it("classifies 'Waning Gibbous' when angle < 90° and waning", () => {
    expect(getMoonPhase(mk(60, 0.65, false))).toBe("Waning Gibbous");
  });

  it("treats exactly 50% illumination as a Quarter (waxing→First, waning→Last)", () => {
    expect(getMoonPhase(mk(90, 0.5, true))).toBe("First Quarter");
    expect(getMoonPhase(mk(90, 0.5, false))).toBe("Last Quarter");
  });

  it("does not call 25% illumination a Quarter (it's Crescent)", () => {
    expect(getMoonPhase(mk(120, 0.25, true))).toBe("Waxing Crescent");
    expect(getMoonPhase(mk(120, 0.25, false))).toBe("Waning Crescent");
  });

  it("supports angles beyond 180° by folding (e.g., 270° behaves like 90°)", () => {
    expect(getMoonPhase(mk(270, 0.5, false))).toBe("Last Quarter");
    expect(getMoonPhase(mk(270, 0.5, true))).toBe("First Quarter");
  });
});
