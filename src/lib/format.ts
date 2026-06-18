export function formatDistance(distanceM: number): string {
  if (!Number.isFinite(distanceM)) return '0,00 km';
  return `${(distanceM / 1000).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} km`;
}

export function formatMeters(distanceM: number): string {
  return `${Math.round(distanceM).toLocaleString('es-ES')} m`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatPace(totalMs: number, distanceM: number): string {
  if (distanceM <= 0 || totalMs <= 0) return '--:-- /km';

  const secondsPerKm = Math.round((totalMs / 1000) / (distanceM / 1000));
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
}

export function formatSpeedKmh(totalMs: number, distanceM: number): string {
  if (distanceM <= 0 || totalMs <= 0) return '0,0 km/h';

  const hours = totalMs / 3_600_000;
  const km = distanceM / 1000;
  return `${(km / hours).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km/h`;
}

export function formatDurationSpeech(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);

  return parts.join(' y ');
}

export function formatPaceSpeech(msPerKm: number): string {
  if (!Number.isFinite(msPerKm) || msPerKm <= 0) return 'ritmo no disponible';
  const seconds = Math.round(msPerKm / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} y ${rest} ${rest === 1 ? 'segundo' : 'segundos'} por kilómetro`;
}
