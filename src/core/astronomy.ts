import * as AstronomyNS from "astronomy-engine";
import type { MoonState } from "./types";

// Interop: in some loaders the API is on the default export, in others on the namespace.
const Astronomy = (AstronomyNS as { default?: typeof AstronomyNS }).default ?? AstronomyNS;

function addDays(d: Date, days: number) {
  const n = new Date(d.getTime());
  n.setDate(n.getDate() + days);
  return n;
}

function isWaxingAt(date: Date): boolean {
  const today = (Astronomy.Illumination(Astronomy.Body.Moon, date) as { phase_fraction: number }).phase_fraction;
  const tomorrow = (Astronomy.Illumination(Astronomy.Body.Moon, addDays(date, 1)) as { phase_fraction: number }).phase_fraction;
  return tomorrow > today;
}

export function getMoonState(date: Date): MoonState {
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date) as { phase_angle: number; phase_fraction: number };
  const lib = Astronomy.Libration(date) as { dist_km: number; diam_deg: number; elon: number; elat: number };
  return {
    date,
    phase: {
      phaseAngleDeg: illum.phase_angle,
      illuminatedFraction: illum.phase_fraction,
      isWaxing: isWaxingAt(date)
    },
    size: {
      distanceKm: lib.dist_km,
      angularDiameterDeg: lib.diam_deg
    },
    libration: {
      elon: lib.elon,
      elat: lib.elat
    }
  };
}

/**
 * Returns the English name for the moon phase using phase angle (preferred) with small tolerances.
 * Conventions (Astronomy Engine):
 * - phaseAngleDeg = 0° → Full Moon
 * - phaseAngleDeg = 180° → New Moon
 * - phaseAngleDeg ≈ 90° → Quarter (half-illuminated)
 *
 * We fold angles > 180° into [0..180] symmetry and use `isWaxing` to disambiguate waxing vs waning,
 * and First vs Last Quarter. Illumination fraction is used only as a secondary fallback threshold.
 */
export function getMoonPhase(moonState: MoonState): string {
  const { phaseAngleDeg, illuminatedFraction } = moonState.phase;
  // Prefer provided waxing flag; if missing, make a best-effort guess from angle (ambiguous, but safer than undefined).
  const waxing = moonState.phase.isWaxing ?? (phaseAngleDeg > 90);

  // Normalize to [0, 360), then fold to [0, 180] for symmetry about Full/New.
  const a0 = ((phaseAngleDeg % 360) + 360) % 360;
  const a = a0 > 180 ? 360 - a0 : a0; // 0..180

  // Angular tolerances (degrees)
  const FULL_EPS = 10;     // within ±10° of full
  const NEW_EPS = 10;      // within ±10° of new
  const QUARTER_EPS = 8;   // within ±8° of quarter

  // Secondary illumination fallbacks for robustness
  const NEAR_FULL_FRAC = 0.98; // ≥98% illuminated ⇒ Full
  const NEAR_NEW_FRAC  = 0.02; // ≤2% illuminated  ⇒ New
  const NEAR_HALF_FRAC = 0.02; // within ±2% of 0.5 ⇒ Quarter

  // Full / New via angle or strong illumination thresholds
  if (a <= FULL_EPS || illuminatedFraction >= NEAR_FULL_FRAC) return "Full Moon";
  if (a >= 180 - NEW_EPS || illuminatedFraction <= NEAR_NEW_FRAC) return "New Moon";

  // Quarters: angular ±eps around 90°, or illumination very near 0.5
  if (Math.abs(a - 90) <= QUARTER_EPS || Math.abs(illuminatedFraction - 0.5) <= NEAR_HALF_FRAC) {
    return waxing ? "First Quarter" : "Last Quarter";
  }

  // Remaining regions split into gibbous (near full, a < 90) vs crescent (near new, a > 90)
  if (a < 90) {
    return waxing ? "Waxing Gibbous" : "Waning Gibbous";
  }
  // a > 90
  return waxing ? "Waxing Crescent" : "Waning Crescent";
}
