# TODO — lite-side-of-the-moon

An ordered, pragmatic path to a tiny, dependency-free Moon renderer.

## 0) Project scaffolding
- [x] Dual ESM/CJS build with `tsup` (minified, d.ts, sourcemaps).
- [x] TypeScript config for ES2022 + strict mode.
- [x] Vitest config (library mode).
- [x] Public API skeleton: `getMoonState(date)`, `renderMoon(state, opts)`.

## 1) Define the public API (stabilize)
- [ ] Finalize exported types: `MoonState`, `Libration`, `RenderOptions`.
- [ ] Add JSDoc to all public functions.
- [ ] Add a tiny README API section + usage snippet.

## 2) Renderer (Unicode twelfths, with fallbacks)
- [ ] Rasterizer: compute circle radius vs `lines` (aspect fix for terminal cells).
- [ ] Terminator geometry: position via `phaseAngleDeg` (0° full, 180° new).
- [ ] Apply libration: slight x/y shifts/warps of bright/dark "spots" for flavor (start subtle).
- [ ] Glyph mapping:
  - [ ] Prefer **Unicode 16.0** *Symbols for Legacy Computing Supplement* twelfth-circle glyphs (U+1CC30..1CC3F).
  - [ ] Fallback to **Legacy Computing** block (U+1FB00..1FBFF) quarters/sextants.
  - [ ] Final fallback to `█ ▓ ▒ ░`.
- [ ] Output builder: `string[]` lines; `RenderOptions`: `lines`, `invert`, `forceLegacySymbols`.
- [ ] Golden sample images (ASCII saved to `examples/`) for manual visual checks.

## 3) Almanac generation (dev-time only)
- [ ] Implement `scripts/generate-almanac.ts` fidelity & performance passes:
  - [ ] Choose sampling cadence (start with **6h**). Validate error vs 1h/3h on a subset.
  - [ ] Store: phaseAngleDeg, illuminatedFraction, distanceKm, angularDiameterDeg, libration (elon, elat).
  - [ ] Quantize to shrink source: angle→1/100°, fraction→1e-4, distance→0.1 km (reversible).
  - [ ] Emit `lookupMoonStateFromAlmanac(date)` with fast binary-search + linear interpolation.
- [ ] Add `scripts/verify-against-astronomy-engine.ts`:
  - [ ] Random-sample 1950–2050; print max errors.
  - [ ] Gates: `illumFraction < 0.01`, `phaseAngle < 0.5°`, `diameter < 0.01°`, `distance < 50 km` (tune).
- [ ] CI step (later): run generator + verification on push to `main` (skippable locally).

## 4) Testing
- [ ] Unit tests for interpolation correctness (against hand-picked known dates).
- [ ] Renderer snapshot tests: freeze output for canonical dates (new, first quarter, full, last quarter).
- [ ] Size guard test: assert **dist/** total ≤ _TBD_ KB (fail if bigger).

## 5) Examples & Docs
- [ ] `scripts/demo-render.ts` prints today’s Moon.
- [ ] README: add "Development Process" steps to regenerate almanac + verify.
- [ ] Note on terminal font coverage for U+1CCxx and legacy fallbacks.

## 6) Browser & Workers
- [ ] Confirm bundle runs in modern browsers (no Node-only APIs).
- [ ] Cloudflare Workers dry-run (no Node APIs used); document usage.
- [ ] Publish `exports` are environment-neutral (pure ESM recommended).

## 7) Release process
- [ ] `0.1.0` preview release (docs + demo).
- [ ] Feedback loop on renderer aesthetics, symbol selection, default `lines`.
- [ ] `1.0.0` once API & output considered stable.

## 8) Stretch goals (post-1.0)
- [ ] Add **position angle of bright limb** to rotate the crescent correctly.
- [ ] Option for **hemisphere-aware** view (northern vs southern hemisphere inversion).
- [ ] Optional **topo parallax** (observer lat/lon) for nerd-mode.
- [ ] Tiny Web demo page.

---
**Commands**
- Generate: `pnpm gen:almanac`
- Verify:   `pnpm verify`
- Build:    `pnpm build`
- Demo:     `pnpm render:demo`