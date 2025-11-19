# TODO — lite-side-of-the-moon

An ordered, pragmatic path to a tiny, dependency-free Moon renderer.

## 0) Project scaffolding
- [x] Dual ESM/CJS build with `tsup` (minified, d.ts, sourcemaps).
- [x] TypeScript config for ES2022 + strict mode.
- [x] Vitest config (library mode).
- [x] Public API skeleton: `getMoonState(date)`, `renderMoon(state, opts)`.

## 1) Core Features
- [ ] Calculate Moon position (Altitude, Azimuth) based on observer location.
- [ ] Calculate Parallactic Angle (Rotation) based on observer location.
- [ ] Render rotated moon.
- [ ] Render horizon line and clip moon when near/below horizon.

## 2) CLI
- [x] Support HH:MM time format in date argument.
- [x] Support optional Latitude/Longitude arguments.

---
**Commands**
- Generate: `pnpm gen:almanac`
- Verify:   `pnpm verify`
- Build:    `pnpm build`
- Demo:     `pnpm render:demo`