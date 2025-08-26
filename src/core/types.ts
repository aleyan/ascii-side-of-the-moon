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

export interface MoonState {
  date: Date;
  /** Phase angle (deg): 0=full, 180=new (per Astronomy Engine convention for phase angle). */
  phase: MoonPhase;
  size: MoonSize;
  libration: MoonLibration;
}

export interface RenderOptions {
  /** Number of text rows to use. (Renderer currently fixes output to FRAME_H.) */
  lines?: number;
  /** Invert light/dark (kept for future use). */
  invert?: boolean;
  /** If true, prefer legacy block elements instead of twelfth-circle glyphs. (Unused now.) */
  forceLegacySymbols?: boolean;
}