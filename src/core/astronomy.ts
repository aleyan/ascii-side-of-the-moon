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
