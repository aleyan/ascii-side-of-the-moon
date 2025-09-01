#!/usr/bin/env node

import { getMoonState, renderMoon } from "./index.js";

function main() {
  const args = process.argv.slice(2);
  const dateArg = args[0];
  
  let date: Date;
  
  if (dateArg) {
    // Parse the date argument
    const parsedDate = new Date(dateArg);
    if (isNaN(parsedDate.getTime())) {
      console.error(`Invalid date format: ${dateArg}`);
      console.error("Please use format: YYYY-MM-DD (e.g., 2025-01-01)");
      process.exit(1);
    }
    date = parsedDate;
  } else {
    // Use current date if no argument provided
    date = new Date();
  }
  
  try {
    const moonState = getMoonState(date);
    const asciiMoon = renderMoon(moonState);
    
    console.log(asciiMoon);
  } catch (error) {
    console.error("Error rendering moon:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
