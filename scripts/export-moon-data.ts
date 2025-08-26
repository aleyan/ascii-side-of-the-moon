import { writeFileSync } from "fs";
import { getMoonState } from "../src/render/astronomy";

function* eachDayInclusive(start: Date, end: Date): Generator<Date> {
  let d = new Date(start.getTime());
  while (d.getTime() <= end.getTime()) {
    yield d;
    d = new Date(d.getTime());
    d.setDate(d.getDate() + 1);
  }
}

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

// Start from January 1, 1901
const startDate = new Date(1901, 0, 1);
// End at December 31, 2100
const endDate = new Date(2100, 11, 31);

// Generate CSV content
const lines: string[] = [];
lines.push("date,distance_km,libration_elat,libration_elon");

// Generate data for each day
for (const date of eachDayInclusive(startDate, endDate)) {
  const state = getMoonState(date);
  lines.push(
    `${fmtDate(date)},${state.size.distanceKm.toFixed(1)},${state.libration.elat.toFixed(3)},${state.libration.elon.toFixed(3)}`
  );
}

// Write to file
writeFileSync("data/moon_history.csv", lines.join("\n") + "\n", "utf8");
