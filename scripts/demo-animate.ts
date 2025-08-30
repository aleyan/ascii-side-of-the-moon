 
import { renderMoon } from "../src/render/renderer";
import { getMoonState } from "../src/core/astronomy";

// Parse args: 0, 1, or 2 YYYY-MM-DD dates.
const argv = process.argv.slice(2);

function parseDateYYYYMMDD(s: string): Date {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, (M ?? 1) - 1, D ?? 1, 0, 0, 0, 0);
}

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function addDays(d: Date, days: number) {
  const n = new Date(d.getTime());
  n.setDate(n.getDate() + days);
  return n;
}

function* eachDayInclusive(start: Date, end: Date): Generator<Date> {
  const d = new Date(start.getTime());
  while (d.getTime() <= end.getTime()) {
    yield new Date(d.getTime());
    d.setDate(d.getDate() + 1);
  }
}

function clear() { process.stdout.write("\x1b[2J\x1b[H"); }
function hideCursor() { process.stdout.write("\x1b[?25l"); }
function showCursor() { process.stdout.write("\x1b[?25h"); }

async function main() {
  let start: Date;
  let end: Date;

  if (argv.length === 0) {
    start = new Date(); start.setHours(0, 0, 0, 0);
    end = addDays(start, 30);
  } else if (argv.length === 1) {
    start = parseDateYYYYMMDD(argv[0]!);
    end = addDays(start, 30);
  } else {
    start = parseDateYYYYMMDD(argv[0]!);
    end = parseDateYYYYMMDD(argv[1]!);
  }

  if (end < start) { const t = start; start = end; end = t; }

  hideCursor();
  const restore = () => { showCursor(); };
  process.on("SIGINT", () => { restore(); process.exit(0); });
  process.on("exit", restore);

  for (const day of eachDayInclusive(start, end)) {
    const st = getMoonState(day);
    const art = renderMoon(st, { lines: 20 });
    clear();
    const info =
      `Date: ${fmtDate(day)}  ` +
      `illum=${(st.phase.illuminatedFraction * 100).toFixed(1).padStart(5)}%  ` +
      `phase=${st.phase.phaseAngleDeg.toFixed(1).padStart(5)}°  ` +
      `waxing=${st.phase.isWaxing ? "yes" : "no"}  ` +
      `dist=${st.size.distanceKm.toFixed(0).padStart(6)} km\n` +
      `Libration: lat=${st.libration.elat.toFixed(1).padStart(5)}°  lon=${st.libration.elon.toFixed(1).padStart(5)}°`;
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