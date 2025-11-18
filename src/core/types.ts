export interface MoonLibration {
  /** Ecliptic longitude libration (degrees). */
  elon: number;
  /** Ecliptic latitude libration (degrees). */
  elat: number;
}

export interface MoonPhase {
  /** Phase angle (deg): 0=full, 180=new (per Astronomy Engine convention for phase angle). */
  phaseAngleDeg: number;
  /** Illuminated fraction [0..1]. */
  illuminatedFraction: number;
  /** If true, bright limb on the right (waxing). If false, bright limb on the left (waning). */
  isWaxing?: boolean;
}

export interface MoonSize {
  /** Geocentric distance (km). */
  distanceKm: number;
  /** Apparent angular diameter (deg). */
  angularDiameterDeg: number;
}

export interface MoonPosition {
  /** Azimuth (degrees): 0=North, 90=East, etc. */
  azimuth: number;
  /** Altitude (degrees): +90=Zenith, 0=Horizon, -90=Nadir. */
  altitude: number;
  /** Parallactic angle (degrees): Rotation of the moon's disk relative to the zenith (positive = clockwise).
   */
  parallacticAngle: number;
}

export interface MoonState {
  date: Date;
  /** Phase angle (deg): 0=full, 180=new (per Astronomy Engine convention for phase angle). */
  phase: MoonPhase;
  size: MoonSize;
  libration: MoonLibration;
  /** Observer-dependent position. Undefined if no location provided. */
  position?: MoonPosition;
}

export interface MoonAsciiDimensions {
  /** Width of the moon in characters (excluding padding) */
  width: number;
  /** Height of the moon in characters (excluding padding) */
  height: number;
  /** X-coordinate of center in characters from left edge */
  centerX: number;
  /** Y-coordinate of center in characters from top edge */
  centerY: number;
}

export interface RenderOptions {
  /** Number of text rows to use. (Renderer currently fixes output to FRAME_H.) */
  lines?: number;
  /** Invert light/dark (kept for future use). */
  invert?: boolean;
  /** If true, prefer legacy block elements instead of twelfth-circle glyphs. (Unused now.) */
  forceLegacySymbols?: boolean;
}