export type ActivityStatus = 'idle' | 'recording' | 'paused' | 'finished';

export interface TrackPoint {
  id: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  time: string;
  elapsedMs: number;
  segmentId: string;
}

export interface Segment {
  id: string;
  startedAt: string;
  endedAt?: string;
  distanceM: number;
  points: TrackPoint[];
}

export interface Split {
  km: number;
  distanceM: number;
  elapsedMs: number;
  splitElapsedMs: number;
  paceSecPerKm: number;
  at: string;
}

export interface Activity {
  id: string;
  name: string;
  startedAt?: string;
  endedAt?: string;
  status: ActivityStatus;
  activeSegmentId?: string;
  segments: Segment[];
  splits: Split[];
  totalDistanceM: number;
}

export interface TrackerSettings {
  minAccuracyM: number;
  minDistanceM: number;
  maxSpeedMps: number;
  announceEveryKm: boolean;
  /**
   * Factor aplicado a la precisión (en metros) del punto para descartar el
   * "ruido" del GPS cuando estás parado o te mueves muy despacio. Un valor de
   * 0.5 exige que el desplazamiento supere la mitad del margen de error antes
   * de registrarse como movimiento real.
   */
  jitterAccuracyFactor: number;
}
