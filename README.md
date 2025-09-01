# WHAT

`ascii-side-of-the-moon` is a small library that prints an ascii representation of the moon on a given date.

For a given date it returns a 29 row by 60 column string.

![moon](https://github.com/user-attachments/assets/0baf4510-12cb-49db-a816-785334ba52ef)

## CLI Usage

You can use this package directly from the command line:

```bash
# Show moon for current date
npx ascii-side-of-the-moon

# Show moon for a specific date
npx ascii-side-of-the-moon 2025-09-21
```

The CLI will display the ASCII moon art along with information about the moon's phase, illumination percentage, distance, and angular diameter.

## Example

```js
import { getMoonState, renderMoon, getMoonPhase } from 'ascii-side-of-the-moon';

// Get moon state for January 1st, 2025
const date = new Date(2025, 0, 1); // Note: month is 0-based in JavaScript
const moonState = getMoonState(date);

// Get the moon phase name
const phaseName = getMoonPhase(moonState);
console.log(`Moon Phase: ${phaseName}`); // e.g., "Waxing Crescent"

// Render the moon's ASCII representation
const moonAscii = renderMoon(moonState);

// Print to console
console.log(moonAscii);
```

## API Reference

### `getMoonState(date: Date): MoonState`
Returns detailed moon information including phase, size, and libration data.

### `renderMoon(moonState: MoonState, options?: RenderOptions): string`
Renders the moon as ASCII art. Returns a 29×60 character string.

### `getMoonPhase(moonState: MoonState): string`
Returns the English name of the moon phase (e.g., "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent").

## Local Demo
Inside of repository for `ascii-side-of-the-moon`.

Render a single date:
```sh
pnpm run render:demo 2025-01-01
```

Render an animation:
```sh
pnpm run render:demo_animate 2025-01-01 2025-12-30
```

Both demo scripts now include the moon phase name in their output.

## Char aspect ratio.
This package assumes a character ratio of 10/22.

## Preview image
The preview svg was generated with these commands:
```sh
asciinema rec -c "pnpm run render:demo_animate 2025-07-25 2025-08-23" moon.cast
cat moon.cast | npx svg-term-cli --out=moon.svg
```