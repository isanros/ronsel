import { formatDistance, formatDuration } from '../lib/format';
import type { Segment } from '../types/activity';

function segmentDurationMs(segment: Segment, now: number, isActive: boolean): number {
  const started = Date.parse(segment.startedAt);
  const ended = segment.endedAt ? Date.parse(segment.endedAt) : isActive ? now : segment.points.at(-1) ? Date.parse(segment.points.at(-1)!.time) : started;
  return Math.max(0, ended - started);
}

interface Props {
  segments: Segment[];
  activeSegmentId?: string;
  now: number;
}

export function SegmentsList({ segments, activeSegmentId, now }: Props) {
  if (segments.length === 0) {
    return <p className="empty">Aún no hay segmentos.</p>;
  }

  return (
    <ol className="segments-list">
      {segments.map((segment, index) => {
        const isActive = segment.id === activeSegmentId;
        return (
          <li key={segment.id} className={isActive ? 'active-segment' : ''}>
            <div>
              <strong>Segmento {index + 1}</strong>
              <span>{isActive ? 'Activo' : segment.endedAt ? 'Cerrado' : 'Sin cerrar'}</span>
            </div>
            <div>
              <span>{formatDistance(segment.distanceM)}</span>
              <span>{formatDuration(segmentDurationMs(segment, now, isActive))}</span>
              <span>{segment.points.length} puntos</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
