import type { TrackPoint } from '../types/activity';
import { createId } from './id';

const EARTH_RADIUS_M = 6_371_000;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceM(a: Pick<TrackPoint, 'latitude' | 'longitude'>, b: Pick<TrackPoint, 'latitude' | 'longitude'>): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function positionToTrackPoint(position: GeolocationPosition, segmentId: string, elapsedMs: number): TrackPoint {
  const { coords } = position;

  return {
    id: createId('pt'),
    latitude: coords.latitude,
    longitude: coords.longitude,
    elevation: coords.altitude ?? undefined,
    accuracy: coords.accuracy ?? undefined,
    speed: coords.speed ?? undefined,
    heading: coords.heading ?? undefined,
    time: new Date(position.timestamp || Date.now()).toISOString(),
    elapsedMs,
    segmentId
  };
}
