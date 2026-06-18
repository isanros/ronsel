import type { Activity, TrackPoint } from '../types/activity';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function trkpt(point: TrackPoint): string {
  const elevation = point.elevation === undefined ? '' : `\n        <ele>${point.elevation.toFixed(1)}</ele>`;
  const time = `\n        <time>${escapeXml(point.time)}</time>`;
  const extensions = `\n        <extensions>\n          ${point.accuracy === undefined ? '' : `<rw:accuracy>${point.accuracy.toFixed(1)}</rw:accuracy>`}\n          <rw:elapsedMs>${Math.round(point.elapsedMs)}</rw:elapsedMs>\n        </extensions>`;

  return `      <trkpt lat="${point.latitude.toFixed(7)}" lon="${point.longitude.toFixed(7)}">${elevation}${time}${extensions}\n      </trkpt>`;
}

export function activityToGpx(activity: Activity): string {
  const name = activity.name || 'RunWalk activity';
  const startedAt = activity.startedAt ?? new Date().toISOString();
  const segments = activity.segments
    .filter((segment) => segment.points.length > 0)
    .map((segment) => {
      const points = segment.points.map(trkpt).join('\n');
      return `    <trkseg>\n${points}\n    </trkseg>`;
    })
    .join('\n');

  const splitExtensions = activity.splits.length === 0
    ? ''
    : `\n    <extensions>\n      <rw:splits>\n${activity.splits
        .map((split) => `        <rw:split km="${split.km}" elapsedMs="${Math.round(split.elapsedMs)}" splitElapsedMs="${Math.round(split.splitElapsedMs)}" />`)
        .join('\n')}\n      </rw:splits>\n    </extensions>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
     creator="RunWalk PWA"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xmlns:rw="https://example.com/runwalk-pwa/extensions/1"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${escapeXml(startedAt)}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <type>running</type>${splitExtensions}
${segments}
  </trk>
</gpx>
`;
}

export function downloadActivityGpx(activity: Activity): void {
  const gpx = activityToGpx(activity);
  const blob = new Blob([gpx], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeName = (activity.name || 'runwalk-activity')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const link = document.createElement('a');

  link.href = url;
  link.download = `${safeName || 'runwalk-activity'}.gpx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
