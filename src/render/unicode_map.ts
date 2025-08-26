/**
 * Unicode circle segments:
 * Prefer Unicode 16.0 "Symbols for Legacy Computing Supplement" (U+1CC30..1CC3F)
 * twelfth-circle glyphs when available, else fall back to older "Symbols for Legacy Computing"
 * (U+1FBE0.. etc.) or basic block/sextants.
 *
 * NOTE: Not all terminals ship fonts for U+1CCxx yet.
 */

/** Twelfth-circle code points (subset) */
export const TWELFTH = {
  UPPER_LEFT_QUARTER: String.fromCodePoint(0x1CC35), // U+1CC35 UPPER LEFT QUARTER CIRCLE
  UPPER_RIGHT_QUARTER: String.fromCodePoint(0x1CC36), // U+1CC36 UPPER RIGHT QUARTER CIRCLE
  LOWER_LEFT_QUARTER: String.fromCodePoint(0x1CC39),  // U+1CC39 LOWER LEFT QUARTER CIRCLE
  LOWER_RIGHT_QUARTER: String.fromCodePoint(0x1CC3A), // U+1CC3A LOWER RIGHT QUARTER CIRCLE
  // Twelfths (examples)
  UPPER_LEFT_TWELFTH: String.fromCodePoint(0x1CC30),  // UPPER LEFT TWELFTH CIRCLE
  UPPER_CENTER_LEFT_TWELFTH: String.fromCodePoint(0x1CC31),
  UPPER_CENTER_RIGHT_TWELFTH: String.fromCodePoint(0x1CC32),
  UPPER_RIGHT_TWELFTH: String.fromCodePoint(0x1CC33),
  LOWER_LEFT_TWELFTH: String.fromCodePoint(0x1CC3C),
  LOWER_CENTER_LEFT_TWELFTH: String.fromCodePoint(0x1CC3D),
  LOWER_CENTER_RIGHT_TWELFTH: String.fromCodePoint(0x1CC3E),
  LOWER_RIGHT_TWELFTH: String.fromCodePoint(0x1CC3F)
} as const;

/** Legacy fallbacks (some useful white-circle halves/quarters) */
export const LEGACY = {
  TOP_JUSTIFIED_LOWER_HALF_WHITE_CIRCLE: String.fromCodePoint(0x1FBE0),
  RIGHT_JUSTIFIED_LEFT_HALF_WHITE_CIRCLE: String.fromCodePoint(0x1FBE1),
  BOTTOM_JUSTIFIED_UPPER_HALF_WHITE_CIRCLE: String.fromCodePoint(0x1FBE2),
  LEFT_JUSTIFIED_RIGHT_HALF_WHITE_CIRCLE: String.fromCodePoint(0x1FBE3)
} as const;

/** Coarse block characters as last-resort fallback */
export const BLOCKS = {
  FULL: "█",
  THREE_QUARTERS: "▓",
  HALF: "▒",
  QUARTER: "░",
  EMPTY: " "
} as const;