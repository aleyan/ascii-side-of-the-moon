 

import { renderMoon } from "../src/render/renderer";
import { getMoonState, getMoonPhase } from "../src/core/astronomy";

function parseDateYYYYMMDD(s: string): Date {
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    console.error("Date must be in YYYY-MM-DD format");
    process.exit(1);
  }
  const [, Y, M, D] = match.slice();
  const date = new Date(+Y, +M - 1, +D, 0, 0, 0, 0);
  if (isNaN(date.getTime())) {
    console.error("Invalid date");
    process.exit(1);
  }
  return date;
}

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

// Use provided date or today
const date = process.argv[2] ? parseDateYYYYMMDD(process.argv[2]) : new Date();
date.setHours(0, 0, 0, 0);

const state = getMoonState(date);

const info =
  `Date: ${fmtDate(date)}  ` +
  `illum=${(state.phase.illuminatedFraction * 100).toFixed(1).padStart(5)}%  ` +
  `phase=${state.phase.phaseAngleDeg.toFixed(1).padStart(5)}°  ` +
  `waxing=${state.phase.isWaxing ? "yes" : "no"}  ` +
  `dist=${state.size.distanceKm.toFixed(0).padStart(6)} km\n` +
  `Libration: lat=${state.libration.elat.toFixed(1).padStart(5)}°  lon=${state.libration.elon.toFixed(1).padStart(5)}°\n` +
  `Moon Phase: ${getMoonPhase(state)}`;

console.log(info);
console.log(renderMoon(state, { lines: 20 }));