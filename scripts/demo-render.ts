import { renderMoon } from "../src/render/renderer";
import { getMoonState, getMoonPhase } from "../src/core/astronomy";
import type { ObserverLocation, Frame } from "../src/core/types";

const VALID_FRAMES: Frame[] = ["celestial_up", "celestial_down", "observer"];

function printUsage() {
  console.log(`Usage: pnpm run render:demo [date] [time] [--lat <degrees>] [--lon <degrees>] [--elevation <meters>] [--frame <frame>]

Arguments:
  date        Date in YYYY-MM-DD format (default: today)
  time        Time in HH:MM format (default: 00:00)
  --lat       Observer latitude in degrees (-90 to 90)
  --lon       Observer longitude in degrees (-180 to 180)
  --elevation Observer elevation in meters (optional)
  --frame     Reference frame: celestial_up, celestial_down, or observer
              (default: observer if lat/lon provided, celestial_up otherwise)

Examples:
  pnpm run render:demo
  pnpm run render:demo 2025-01-01
  pnpm run render:demo 2025-01-01 21:30
  pnpm run render:demo 2025-01-01 21:30 --lat 40.7128 --lon -74.0060
  pnpm run render:demo --lat 37.7749 --lon -122.4194 --elevation 25
  pnpm run render:demo 2025-01-01 --frame=celestial_down
`);
}

function parseDate(dateStr: string, timeStr?: string): Date {
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    console.error("Date must be in YYYY-MM-DD format");
    process.exit(1);
  }
  const [, Y, M, D] = dateMatch;
  
  let hours = 0;
  let minutes = 0;
  
  if (timeStr) {
    const timeMatch = timeStr.match(/^(\d{2}):(\d{2})$/);
    if (!timeMatch) {
      console.error("Time must be in HH:MM format");
      process.exit(1);
    }
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
  }
  
  // Create date in UTC
  const date = new Date(Date.UTC(+Y!, +M! - 1, +D!, hours, minutes, 0, 0));
  if (isNaN(date.getTime())) {
    console.error("Invalid date/time");
    process.exit(1);
  }
  return date;
}

function fmtDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${da} ${h}:${min} UTC`;
}

function parseArgs(args: string[]): { date: Date; observer?: ObserverLocation; frame?: Frame } {
  let dateStr: string | undefined;
  let timeStr: string | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;
  let elevation: number | undefined;
  let frame: Frame | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    
    if (arg?.startsWith("--")) {
      const [flag, inline] = arg.split("=", 2);
      const key = flag?.slice(2);
      
      const getValue = (): string => {
        if (inline !== undefined) return inline;
        const next = args[++i];
        if (next === undefined || next.startsWith("--")) {
          console.error(`Missing value for ${flag}`);
          process.exit(1);
        }
        return next;
      };
      
      switch (key) {
        case "lat":
          latitude = parseFloat(getValue());
          if (isNaN(latitude) || latitude < -90 || latitude > 90) {
            console.error("Latitude must be between -90 and 90");
            process.exit(1);
          }
          break;
        case "lon":
        case "long":
        case "longitude":
          longitude = parseFloat(getValue());
          if (isNaN(longitude) || longitude < -180 || longitude > 180) {
            console.error("Longitude must be between -180 and 180");
            process.exit(1);
          }
          break;
        case "elev":
        case "elevation":
          elevation = parseFloat(getValue());
          if (isNaN(elevation)) {
            console.error("Elevation must be a number");
            process.exit(1);
          }
          break;
        case "frame": {
          const value = getValue();
          if (!VALID_FRAMES.includes(value as Frame)) {
            console.error(`Invalid frame value: ${value}. Must be one of: ${VALID_FRAMES.join(", ")}`);
            process.exit(1);
          }
          frame = value as Frame;
          break;
        }
        default:
          console.error(`Unknown flag: ${flag}`);
          process.exit(1);
      }
    } else if (!dateStr && /^\d{4}-\d{2}-\d{2}$/.test(arg!)) {
      dateStr = arg;
    } else if (!timeStr && /^\d{2}:\d{2}$/.test(arg!)) {
      timeStr = arg;
    } else {
      console.error(`Unexpected argument: ${arg}`);
      process.exit(1);
    }
  }

  // Validate lat/lon pair
  if ((latitude === undefined) !== (longitude === undefined)) {
    console.error("Latitude and longitude must be provided together");
    process.exit(1);
  }
  
  if (elevation !== undefined && latitude === undefined) {
    console.error("Elevation requires latitude and longitude");
    process.exit(1);
  }

  const date = dateStr ? parseDate(dateStr, timeStr) : new Date();
  
  const observer: ObserverLocation | undefined = 
    latitude !== undefined && longitude !== undefined
      ? { latitude, longitude, elevationMeters: elevation }
      : undefined;

  // Apply default frame logic
  const resolvedFrame: Frame = frame ?? (observer ? "observer" : "celestial_up");

  return { date, observer, frame: resolvedFrame };
}

const { date, observer, frame } = parseArgs(process.argv.slice(2));
const state = getMoonState(date, observer);

let info =
  `Date: ${fmtDate(date)}  ` +
  `illum=${(state.phase.illuminatedFraction * 100).toFixed(1).padStart(5)}%  ` +
  `phase=${state.phase.phaseAngleDeg.toFixed(1).padStart(5)}°  ` +
  `waxing=${state.phase.isWaxing ? "yes" : "no"}  ` +
  `dist=${state.size.distanceKm.toFixed(0).padStart(6)} km\n` +
  `Libration: lat=${state.libration.elat.toFixed(1).padStart(5)}°  lon=${state.libration.elon.toFixed(1).padStart(5)}°\n` +
  `Moon Phase: ${getMoonPhase(state)}  Frame: ${frame}`;

if (observer) {
  const latDir = observer.latitude >= 0 ? "N" : "S";
  const lonDir = observer.longitude >= 0 ? "E" : "W";
  info += `\nObserver: ${Math.abs(observer.latitude).toFixed(4)}°${latDir}, ${Math.abs(observer.longitude).toFixed(4)}°${lonDir}`;
  if (observer.elevationMeters !== undefined) {
    info += `, ${observer.elevationMeters}m`;
  }
  if (state.position) {
    info += `\nPosition: alt=${state.position.altitude.toFixed(1)}°, az=${state.position.azimuth.toFixed(1)}°, parallactic=${state.position.parallacticAngle.toFixed(1)}°`;
  }
}

console.log(info);
console.log(renderMoon(state, { lines: 20, frame }));
