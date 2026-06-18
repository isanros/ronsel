import { getMovingTimeMs, getTotalPoints } from '../lib/activity';
import { formatDistance, formatDuration, formatPace, formatSpeedKmh } from '../lib/format';
import type { Activity } from '../types/activity';

interface Props {
  activity: Activity;
  now: number;
}

export function StatsGrid({ activity, now }: Props) {
  const movingTimeMs = getMovingTimeMs(activity, now);
  const points = getTotalPoints(activity);

  return (
    <section className="stats-grid" aria-label="Resumen de actividad">
      <article className="stat-card primary-stat">
        <span>Distancia</span>
        <strong>{formatDistance(activity.totalDistanceM)}</strong>
      </article>
      <article className="stat-card">
        <span>Tiempo</span>
        <strong>{formatDuration(movingTimeMs)}</strong>
      </article>
      <article className="stat-card">
        <span>Ritmo medio</span>
        <strong>{formatPace(movingTimeMs, activity.totalDistanceM)}</strong>
      </article>
      <article className="stat-card">
        <span>Velocidad media</span>
        <strong>{formatSpeedKmh(movingTimeMs, activity.totalDistanceM)}</strong>
      </article>
      <article className="stat-card">
        <span>Segmentos</span>
        <strong>{activity.segments.length}</strong>
      </article>
      <article className="stat-card">
        <span>Puntos GPS</span>
        <strong>{points}</strong>
      </article>
    </section>
  );
}
