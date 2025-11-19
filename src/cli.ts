#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */

const { getMoonState, renderMoon } = require("./index.js");
const { parseCliArgs } = require("./cli-args.js");

function main() {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    const moonState = getMoonState(args.date, args.observer);
    const asciiMoon = renderMoon(moonState);
    
    console.log(asciiMoon);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error:", message);
    process.exit(1);
  }
}


if (require.main === module) {
  main();
}
