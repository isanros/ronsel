import type { Activity, Segment, Split, TrackerSettings } from '../types/activity';
import { haversineDistanceM, positionToTrackPoint } from './geo';
import { createId } from './id';

export const DEFAULT_TRACKER_SETTINGS: TrackerSettings = {
  // Aceptamos lecturas algo menos precisas: en ciudad los edificios degradan
  // la precisión y con 50 m descartábamos puntos válidos.
  minAccuracyM: 65,
  // Distancia mínima entre puntos más baja para no recortar esquinas ni curvas.
  minDistanceM: 2,
  maxSpeedMps: 12,
  announceEveryKm: true,
  // Margen anti-deriva más suave (antes 0.5). Reduce el descarte de puntos
  // buenos cuando la precisión reportada es alta numéricamente.
  jitterAccuracyFactor: 0.25
};

export function createEmptyActivity(): Activity {
  return {
    id: createId('activity'),
    name: '',
    status: 'idle',
    segments: [],
    splits: [],
    totalDistanceM: 0
  };
}

function createSegment(now: Date): Segment {
  return {
    id: createId('seg'),
    startedAt: now.toISOString(),
    distanceM: 0,
    points: []
  };
}

export function startNewActivity(now = new Date()): Activity {
  const segment = createSegment(now);
  const label = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(now);

  return {
    id: createId('activity'),
    name: `Actividad ${label}`,
    startedAt: now.toISOString(),
    status: 'recording',
    activeSegmentId: segment.id,
    segments: [segment],
    splits: [],
    totalDistanceM: 0
  };
}

export function startSegment(activity: Activity, now = new Date()): Activity {
  if (activity.status === 'idle' || activity.status === 'finished') {
    return startNewActivity(now);
  }

  if (activity.status === 'recording') {
    return activity;
  }

  const segment = createSegment(now);

  return {
    ...activity,
    status: 'recording',
    activeSegmentId: segment.id,
    segments: [...activity.segments, segment]
  };
}

export function stopSegment(activity: Activity, now = new Date()): Activity {
  if (activity.status !== 'recording' || !activity.activeSegmentId) {
    return activity;
  }

  const endedAt = now.toISOString();

  return {
    ...activity,
    status: 'paused',
    activeSegmentId: undefined,
    segments: activity.segments.map((segment) =>
      segment.id === activity.activeSegmentId && !segment.endedAt
        ? { ...segment, endedAt }
        : segment
    )
  };
}

export function finishActivity(activity: Activity, now = new Date()): Activity {
  const stopped = activity.status === 'recording' ? stopSegment(activity, now) : activity;

  if (stopped.status === 'idle') {
    return stopped;
  }

  return {
    ...stopped,
    status: 'finished',
    activeSegmentId: undefined,
    endedAt: now.toISOString()
  };
}

export function getMovingTimeMs(activity: Activity, nowMs = Date.now()): number {
  return activity.segments.reduce((total, segment) => {
    const started = Date.parse(segment.startedAt);
    const ended = segment.endedAt
      ? Date.parse(segment.endedAt)
      : activity.activeSegmentId === segment.id && activity.status === 'recording'
        ? nowMs
        : segment.points.at(-1)
          ? Date.parse(segment.points.at(-1)!.time)
          : started;

    return total + Math.max(0, ended - started);
  }, 0);
}

export function getTotalPoints(activity: Activity): number {
  return activity.segments.reduce((total, segment) => total + segment.points.length, 0);
}

export function getActiveSegment(activity: Activity): Segment | undefined {
  return activity.segments.find((segment) => segment.id === activity.activeSegmentId);
}

function getPositionElapsedMs(activity: Activity, segmentId: string, positionTimestamp: number): number {
  return activity.segments.reduce((total, segment) => {
    const started = Date.parse(segment.startedAt);

    if (segment.id === segmentId) {
      return total + Math.max(0, positionTimestamp - started);
    }

    if (!segment.endedAt) return total;
    return total + Math.max(0, Date.parse(segment.endedAt) - started);
  }, 0);
}

function buildNewSplits(
  previousTotalM: number,
  nextTotalM: number,
  previousElapsedMs: number,
  nextElapsedMs: number,
  previousTimeMs: number,
  nextTimeMs: number,
  existingSplits: Split[]
): Split[] {
  const generated: Split[] = [];
  const deltaM = nextTotalM - previousTotalM;

  if (deltaM <= 0) return generated;

  let nextKm = existingSplits.length + 1;
  let thresholdM = nextKm * 1000;

  while (thresholdM <= nextTotalM) {
    const ratio = Math.max(0, Math.min(1, (thresholdM - previousTotalM) / deltaM));
    const elapsedMs = previousElapsedMs + ratio * (nextElapsedMs - previousElapsedMs);
    const atMs = previousTimeMs + ratio * (nextTimeMs - previousTimeMs);
    const previousSplitElapsedMs = generated.length > 0
      ? generated[generated.length - 1].elapsedMs
      : existingSplits.at(-1)?.elapsedMs ?? 0;
    const splitElapsedMs = elapsedMs - previousSplitElapsedMs;

    generated.push({
      km: nextKm,
      distanceM: thresholdM,
      elapsedMs,
      splitElapsedMs,
      paceSecPerKm: splitElapsedMs / 1000,
      at: new Date(atMs).toISOString()
    });

    nextKm += 1;
    thresholdM = nextKm * 1000;
  }

  return generated;
}

export function appendPosition(activity: Activity, position: GeolocationPosition, settings = DEFAULT_TRACKER_SETTINGS): Activity {
  if (activity.status !== 'recording' || !activity.activeSegmentId) {
    return activity;
  }

  const activeSegment = getActiveSegment(activity);
  if (!activeSegment) return activity;

  const accuracy = position.coords.accuracy;
  if (Number.isFinite(accuracy) && accuracy > settings.minAccuracyM) {
    return activity;
  }

  const positionTimestamp = position.timestamp || Date.now();
  const elapsedMs = getPositionElapsedMs(activity, activeSegment.id, positionTimestamp);
  const point = positionToTrackPoint(position, activeSegment.id, elapsedMs);
  const lastPoint = activeSegment.points.at(-1);

  let deltaM = 0;
  let newSplits: Split[] = [];

  if (lastPoint) {
    deltaM = haversineDistanceM(lastPoint, point);
    const lastTimeMs = Date.parse(lastPoint.time);
    const deltaSeconds = Math.max(0.001, (positionTimestamp - lastTimeMs) / 1000);
    const inferredSpeedMps = deltaM / deltaSeconds;

    // Umbral dinámico: combinamos la distancia mínima fija con un margen
    // proporcional a la precisión reportada por el GPS. Así evitamos acumular
    // "deriva" (movimiento falso) cuando la señal es mala o estás parado, lo
    // que produce un trazado más limpio y distancias más fiables.
    const jitterThresholdM = Number.isFinite(accuracy)
      ? accuracy * settings.jitterAccuracyFactor
      : 0;
    const requiredDistanceM = Math.max(settings.minDistanceM, jitterThresholdM);

    if (deltaM < requiredDistanceM) {
      return activity;
    }

    if (inferredSpeedMps > settings.maxSpeedMps) {
      return activity;
    }

    const nextTotalM = activity.totalDistanceM + deltaM;
    newSplits = buildNewSplits(
      activity.totalDistanceM,
      nextTotalM,
      lastPoint.elapsedMs,
      point.elapsedMs,
      lastTimeMs,
      positionTimestamp,
      activity.splits
    );
  }

  const updatedSegment: Segment = {
    ...activeSegment,
    distanceM: activeSegment.distanceM + deltaM,
    points: [...activeSegment.points, point]
  };

  return {
    ...activity,
    totalDistanceM: activity.totalDistanceM + deltaM,
    splits: newSplits.length > 0 ? [...activity.splits, ...newSplits] : activity.splits,
    segments: activity.segments.map((segment) =>
      segment.id === updatedSegment.id ? updatedSegment : segment
    )
  };
}
