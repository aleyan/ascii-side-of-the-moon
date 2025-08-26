import Astronomy from "astronomy-engine";
import type { MoonState } from "../core/types";

function addDays(d: Date, days: number) {
  const n = new Date(d.getTime());
  n.setDate(n.getDate() + days);
  return n;
}

function isWaxingAt(date: Date): boolean {
  const today = Astronomy.Illumination("Moon" as any, date).phase_fraction as number;
  const tomorrow = Astronomy.Illumination("Moon" as any, addDays(date, 1)).phase_fraction as number;
  return tomorrow > today;
}

export function getMoonState(date: Date): MoonState {
  const illum = Astronomy.Illumination("Moon" as any, date);
  const lib = Astronomy.Libration(date);
  return {
    date,
    phase: {
      phaseAngleDeg: +illum.phase_angle,
      illuminatedFraction: +illum.phase_fraction,
      isWaxing: isWaxingAt(date)
    },
    size: {
      distanceKm: +lib.dist_km,
      angularDiameterDeg: +lib.diam_deg
    },
    libration: {
      elon: +lib.elon,
      elat: +lib.elat
    }
  };
}
