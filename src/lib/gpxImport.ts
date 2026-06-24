import { haversineDistanceM } from './geo';
import { createId } from './id';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  time?: string;
}

export interface ParsedRoute {
  id: string;
  name: string;
  points: RoutePoint[];
  distanceM: number;
  durationMs?: number;
  ascentM?: number;
  startedAt?: string;
}

function parseFloatAttr(element: Element, attr: string): number | undefined {
  const raw = element.getAttribute(attr);
  if (raw === null) return undefined;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : undefined;
}

function childText(parent: Element, tagName: string): string | undefined {
  const node = parent.getElementsByTagName(tagName)[0];
  const text = node?.textContent?.trim();
  return text ? text : undefined;
}

function pointFrom(element: Element): RoutePoint | null {
  const latitude = parseFloatAttr(element, 'lat');
  const longitude = parseFloatAttr(element, 'lon');
  if (latitude === undefined || longitude === undefined) return null;

  const eleText = childText(element, 'ele');
  const elevation = eleText !== undefined ? Number.parseFloat(eleText) : undefined;

  return {
    latitude,
    longitude,
    elevation: elevation !== undefined && Number.isFinite(elevation) ? elevation : undefined,
    time: childText(element, 'time')
  };
}

function computeStats(points: RoutePoint[]): Pick<ParsedRoute, 'distanceM' | 'durationMs' | 'ascentM' | 'startedAt'> {
  let distanceM = 0;
  let ascentM = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    distanceM += haversineDistanceM(previous, current);

    if (previous.elevation !== undefined && current.elevation !== undefined) {
      const gain = current.elevation - previous.elevation;
      if (gain > 0) ascentM += gain;
    }
  }

  const firstTime = points.find((point) => point.time)?.time;
  const lastTime = [...points].reverse().find((point) => point.time)?.time;
  let durationMs: number | undefined;

  if (firstTime && lastTime) {
    const diff = Date.parse(lastTime) - Date.parse(firstTime);
    if (Number.isFinite(diff) && diff > 0) durationMs = diff;
  }

  return {
    distanceM,
    durationMs,
    ascentM: ascentM > 0 ? ascentM : undefined,
    startedAt: firstTime
  };
}

/**
 * Convierte el contenido XML de un archivo GPX en una ruta con puntos y
 * estadísticas. Soporta `trkpt` (tracks), `rtept` (rutas) y `wpt` (waypoints)
 * como respaldo. Lanza un error si el XML es inválido o no contiene puntos.
 */
export function parseGpx(content: string, fallbackName: string): ParsedRoute {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'application/xml');

  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('El archivo no es un GPX válido.');
  }

  const tagNames = ['trkpt', 'rtept', 'wpt'];
  let elements: Element[] = [];

  for (const tagName of tagNames) {
    const found = Array.from(doc.getElementsByTagName(tagName));
    if (found.length > 0) {
      elements = found;
      break;
    }
  }

  const points = elements
    .map(pointFrom)
    .filter((point): point is RoutePoint => point !== null);

  if (points.length === 0) {
    throw new Error('El GPX no contiene puntos de ruta.');
  }

  const metadataName = childText(doc.documentElement, 'name');

  return {
    id: createId('gpx'),
    name: metadataName ?? fallbackName,
    points,
    ...computeStats(points)
  };
}

export async function parseGpxFile(file: File): Promise<ParsedRoute> {
  const content = await file.text();
  const fallbackName = file.name.replace(/\.gpx$/i, '');
  return parseGpx(content, fallbackName);
}
