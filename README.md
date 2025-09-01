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
npx ascii-side-of-the-moon 2025-01-01
```

## Example

```js
import { getMoonState, renderMoon } from 'ascii-side-of-the-moon';

// Get moon state for January 1st, 2025
const date = new Date(2025, 0, 1); // Note: month is 0-based in JavaScript
const moonState = getMoonState(date);

// Render the moon's ASCII representation
const moonAscii = renderMoon(moonState);

// Print to console
console.log(moonAscii);
```

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

## Char aspect ratio.
This package assumes a character ratio of 10/22.


## Preview image
The preview svg was generated with these commands:
```sh
asciinema rec -c "pnpm run render:demo_animate 2025-07-25 2025-08-23" moon.cast
cat moon.cast | npx svg-term-cli --out=moon.svg
```