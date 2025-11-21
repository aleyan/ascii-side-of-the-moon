#!/usr/bin/env node

import { getMoonState, renderMoon } from "./index.js";
import { parseCliArgs } from "./cli-args.js";

export function main(argv: string[] = process.argv.slice(2)) {
  try {
    const args = parseCliArgs(argv);
    const moonState = getMoonState(args.date, args.observer);
    const asciiMoon = renderMoon(moonState);
    console.log(asciiMoon);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error:", message);
    process.exit(1);
  }
}

main();
