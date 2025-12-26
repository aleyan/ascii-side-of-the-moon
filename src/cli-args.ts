import type { ObserverLocation, Frame } from "./core/types";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_WITH_TIME_NO_TZ_REGEX = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/;
const DATE_WITH_TIME_REGEX = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/;
const TIME_ONLY_REGEX = /^\d{2}:\d{2}$/;

export interface CliParseOptions {
  now?: () => Date;
}

export interface CliParseResult {
  date: Date;
  observer?: ObserverLocation;
  frame?: Frame;
}

function normalizeDateInput(input: string): string {
  const trimmed = input.trim();
  if (DATE_ONLY_REGEX.test(trimmed)) {
    return `${trimmed}T00:00:00Z`;
  }
  if (DATE_WITH_TIME_NO_TZ_REGEX.test(trimmed)) {
    const iso = trimmed.replace(" ", "T");
    return `${iso}:00Z`;
  }
  if (trimmed.includes(" ")) {
    return trimmed.replace(" ", "T");
  }
  return trimmed;
}

function parseDateOrThrow(value: string): Date {
  const normalized = normalizeDateInput(value);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${value}. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM.`);
  }
  return parsed;
}

function parseNumberOrThrow(rawValue: string, label: string): number {
  if (rawValue === undefined) {
    throw new Error(`Missing value for ${label}.`);
  }
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`Invalid ${label} value: ${rawValue}.`);
  }
  return numericValue;
}

function expectRange(value: number, min: number, max: number, label: string) {
  if (value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
}

function readFlagValue(args: string[], index: number, inlineValue?: string): { value: string; nextIndex: number } {
  if (inlineValue !== undefined) {
    return { value: inlineValue, nextIndex: index };
  }
  const next = args[index + 1];
  if (next === undefined || next.startsWith("--")) {
    throw new Error(`Missing value for ${args[index]}.`);
  }
  return { value: next, nextIndex: index + 1 };
}

function combineDateAndTime(datePart: string, timePart?: string): string {
  if (!timePart) {
    return datePart;
  }
  if (DATE_WITH_TIME_REGEX.test(datePart)) {
    throw new Error("Date argument already contains time; remove the standalone HH:MM value.");
  }
  return `${datePart}T${timePart}`;
}

const VALID_FRAMES: Frame[] = ["celestial_up", "celestial_down", "observer"];

function parseFrameOrThrow(value: string): Frame {
  if (!VALID_FRAMES.includes(value as Frame)) {
    throw new Error(`Invalid frame value: ${value}. Must be one of: ${VALID_FRAMES.join(", ")}.`);
  }
  return value as Frame;
}

export function parseCliArgs(args: string[], options: CliParseOptions = {}): CliParseResult {
  const nowProvider = options.now ?? (() => new Date());
  let datePart: string | undefined;
  let timePart: string | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;
  let elevation: number | undefined;
  let frame: Frame | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const [flag, inline] = arg.split("=", 2);
      const key = flag.slice(2);
      switch (key) {
        case "lat": {
          const { value, nextIndex } = readFlagValue(args, i, inline);
          latitude = parseNumberOrThrow(value, "Latitude");
          expectRange(latitude, -90, 90, "Latitude");
          i = nextIndex;
          break;
        }
        case "lon":
        case "long":
        case "longitude": {
          const { value, nextIndex } = readFlagValue(args, i, inline);
          longitude = parseNumberOrThrow(value, "Longitude");
          expectRange(longitude, -180, 180, "Longitude");
          i = nextIndex;
          break;
        }
        case "elev":
        case "elevation": {
          const { value, nextIndex } = readFlagValue(args, i, inline);
          elevation = parseNumberOrThrow(value, "Elevation");
          i = nextIndex;
          break;
        }
        case "frame": {
          const { value, nextIndex } = readFlagValue(args, i, inline);
          frame = parseFrameOrThrow(value);
          i = nextIndex;
          break;
        }
        default:
          throw new Error(`Unknown flag: ${flag}`);
      }
    } else if (!datePart) {
      if (TIME_ONLY_REGEX.test(arg)) {
        throw new Error("Cannot specify time without a date. Provide YYYY-MM-DD first.");
      }
      datePart = arg;
    } else if (!timePart && TIME_ONLY_REGEX.test(arg)) {
      timePart = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  const combinedDateInput = datePart ? combineDateAndTime(datePart, timePart) : undefined;
  const date = combinedDateInput ? parseDateOrThrow(combinedDateInput) : nowProvider();

  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new Error("Latitude and longitude must be provided together.");
  }
  if (elevation !== undefined && latitude === undefined) {
    throw new Error("Elevation requires latitude and longitude.");
  }

  const observer: ObserverLocation | undefined = latitude !== undefined && longitude !== undefined
    ? {
        latitude,
        longitude,
        elevationMeters: elevation
      }
    : undefined;

  // Apply default frame logic:
  // - If frame is explicitly provided, use it
  // - If lat/lon are provided but no frame, default to 'observer'
  // - If lat/lon are NOT provided and no frame, default to 'celestial_up'
  const resolvedFrame: Frame | undefined = frame ?? (observer ? "observer" : "celestial_up");

  return {
    date,
    observer,
    frame: resolvedFrame
  };
}

