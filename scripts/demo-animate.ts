 
import { renderMoon } from "../src/render/renderer";
import { getMoonState, getMoonPhase } from "../src/core/astronomy";
import type { ObserverLocation } from "../src/core/types";

// Parse args: 0, 1, or 2 YYYY-MM-DD dates.
const argv = process.argv.slice(2);

function parseDateYYYYMMDD(s: string): Date {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, (M ?? 1) - 1, D ?? 1, 0, 0, 0, 0);
}

function fmtDateTime(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${da} ${hh}:${mm}`;
}

function addDays(d: Date, days: number) {
  const n = new Date(d.getTime());
  n.setDate(n.getDate() + days);
  return n;
}

function* eachIntervalInclusive(start: Date, end: Date, hoursStep: number): Generator<Date> {
  const d = new Date(start.getTime());
  while (d.getTime() <= end.getTime()) {
    yield new Date(d.getTime());
    d.setHours(d.getHours() + hoursStep);
  }
}

function readFlagValue(args: string[], index: number, inline?: string): { value: string; nextIndex: number } {
  if (inline !== undefined) {
    return { value: inline, nextIndex: index };
  }
  const next = args[index + 1];
  if (next === undefined || next.startsWith("--")) {
    throw new Error(`Missing value for ${args[index]}.`);
  }
  return { value: next, nextIndex: index + 1 };
}

function parseNumber(value: string, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${label} value: ${value}`);
  return n;
}

function expectRange(value: number, min: number, max: number, label: string) {
  if (value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
}

function parseArgs(): { dates: string[]; observer?: ObserverLocation } {
  const positional: string[] = [];
  let latitude: number | undefined;
  let longitude: number | undefined;
  let elevation: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const [flag, inline] = token.split("=", 2);
    const name = flag.slice(2);
    switch (name) {
      case "lat": {
        const { value, nextIndex } = readFlagValue(argv, i, inline);
        latitude = parseNumber(value, "latitude");
        expectRange(latitude, -90, 90, "Latitude");
        i = nextIndex;
        break;
      }
      case "lon":
      case "long":
      case "longitude": {
        const { value, nextIndex } = readFlagValue(argv, i, inline);
        longitude = parseNumber(value, "longitude");
        expectRange(longitude, -180, 180, "Longitude");
        i = nextIndex;
        break;
      }
      case "elev":
      case "elevation": {
        const { value, nextIndex } = readFlagValue(argv, i, inline);
        elevation = parseNumber(value, "elevation");
        i = nextIndex;
        break;
      }
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }

  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new Error("Latitude and longitude must be provided together.");
  }
  if (elevation !== undefined && latitude === undefined) {
    throw new Error("Elevation requires latitude and longitude.");
  }

  const observer = latitude !== undefined && longitude !== undefined
    ? { latitude, longitude, elevationMeters: elevation }
    : undefined;

  if (positional.length > 2) {
    throw new Error("Pass at most two YYYY-MM-DD dates (start [end]).");
  }

  return { dates: positional, observer };
}

function clear() { process.stdout.write("\x1b[2J\x1b[H"); }
function hideCursor() { process.stdout.write("\x1b[?25l"); }
function showCursor() { process.stdout.write("\x1b[?25h"); }

async function main() {
  const { dates, observer } = parseArgs();
  let start: Date;
  let end: Date;

  if (dates.length === 0) {
    start = new Date(); start.setHours(0, 0, 0, 0);
    end = addDays(start, 30);
  } else if (dates.length === 1) {
    start = parseDateYYYYMMDD(dates[0]!);
    end = addDays(start, 30);
  } else {
    start = parseDateYYYYMMDD(dates[0]!);
    end = parseDateYYYYMMDD(dates[1]!);
  }

  if (end < start) { const t = start; start = end; end = t; }

  hideCursor();
  const restore = () => { showCursor(); };
  process.on("SIGINT", () => { restore(); process.exit(0); });
  process.on("exit", restore);

  for (const instant of eachIntervalInclusive(start, end, 6)) {
    const st = getMoonState(instant, observer);
    const art = renderMoon(st, { lines: 20 });
    clear();
    const positionInfo = st.position
      ? `Alt=${st.position.altitude.toFixed(1).padStart(6)}°  ` +
        `Az=${st.position.azimuth.toFixed(1).padStart(6)}°  ` +
        `ParAng=${st.position.parallacticAngle.toFixed(1).padStart(6)}°`
      : "Alt=   n/a    Az=   n/a    ParAng=   n/a";

    const info =
      `Date: ${fmtDateTime(instant)}  ` +
      `illum=${(st.phase.illuminatedFraction * 100).toFixed(1).padStart(5)}%  ` +
      `phase=${st.phase.phaseAngleDeg.toFixed(1).padStart(5)}°  ` +
      `waxing=${st.phase.isWaxing ? "yes" : "no"}  ` +
      `dist=${st.size.distanceKm.toFixed(0).padStart(6)} km\n` +
      `Libration: lat=${st.libration.elat.toFixed(1).padStart(5)}°  lon=${st.libration.elon.toFixed(1).padStart(5)}°\n` +
      `Position: ${positionInfo}\n` +
      `Moon Phase: ${getMoonPhase(st)}`;
    console.log(info);
    console.log(art);
    await new Promise(res => setTimeout(res, 100)); // 0.1s per frame
  }

  showCursor();
}

main().catch(err => {
  showCursor();
  console.error(err);
  process.exit(1);
});