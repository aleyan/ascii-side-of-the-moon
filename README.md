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
npx ascii-side-of-the-moon 2025-09-19

# Include a specific UTC time (quote when using spaces)
npx ascii-side-of-the-moon "2025-09-19 21:30"

# Provide an observer location (latitude/longitude in degrees, optional elevation in meters)
# (Latitude and longitude are optional, but both must be supplied together;
#  elevation is ignored unless lat/lon are provided.)
npx ascii-side-of-the-moon 2025-09-19T21:30 --lat 37.7749 --lon -122.4194 --elevation 25
```

The CLI will display the ASCII moon art along with information about the moon's phase, illumination percentage, distance, and angular diameter.
When an observer location is supplied, the renderer also knows the altitude/azimuth
and can draw the horizon line to show whether the moon is above or below your local horizon.

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

### `getMoonState(date: Date, observer?: ObserverLocation): MoonState`
Returns detailed moon information including phase, size, and libration data.
If you pass an `observer` (latitude/longitude in degrees, optional elevation in meters),
the returned `MoonState` also contains topocentric position (altitude, azimuth, parallactic angle);
this enables horizon-aware rendering and correct rotation for your sky.

### `renderMoon(moonState: MoonState, options?: RenderOptions): string`
Renders the moon as ASCII art. Returns a 29×60 character string.
`RenderOptions` now includes `showHorizon` (default `true`): set it to `false`
if you want to suppress the horizon overlay even when altitude data is available.

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

# Include observer coordinates (latitude/longitude degrees, optional elevation meters)
pnpm run render:demo_animate 2025-07-25 2025-08-23 --lat 37.7749 --lon -122.4194 --elevation 25
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