import { useRef, useState } from 'react';
import { RouteMap } from './RouteMap';
import { parseGpxFile, type ParsedRoute } from '../lib/gpxImport';
import { formatDistance, formatDuration } from '../lib/format';

export function GpxImport() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [routes, setRoutes] = useState<ParsedRoute[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setLoading(true);
    setError(null);

    const parsed: ParsedRoute[] = [];
    const failed: string[] = [];

    for (const file of Array.from(fileList)) {
      try {
        parsed.push(await parseGpxFile(file));
      } catch (parseError) {
        failed.push(file.name);
        console.warn('No se pudo importar el GPX.', file.name, parseError);
      }
    }

    setRoutes((current) => [...current, ...parsed]);

    if (failed.length > 0) {
      setError(`No se pudieron leer: ${failed.join(', ')}`);
    }

    setLoading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeRoute(id: string) {
    setRoutes((current) => current.filter((route) => route.id !== id));
  }

  function clearAll() {
    setRoutes([]);
    setError(null);
  }

  return (
    <section className="panel">
      <div className="gpx-header">
        <h2>Importar y ver recorridos GPX</h2>
        <div className="gpx-controls">
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? 'Cargando…' : 'Cargar archivos GPX'}
          </button>
          {routes.length > 0 && (
            <button type="button" className="ghost" onClick={clearAll}>
              Quitar todos
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,application/gpx+xml"
          multiple
          hidden
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {routes.length === 0 ? (
        <p className="empty">
          Selecciona uno o varios archivos <code>.gpx</code> para dibujar el recorrido sobre el mapa.
        </p>
      ) : (
        <>
          <RouteMap routes={routes} />

          <ul className="gpx-list">
            {routes.map((route) => (
              <li key={route.id}>
                <div>
                  <strong>{route.name}</strong>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => removeRoute(route.id)}
                    aria-label={`Quitar ${route.name}`}
                  >
                    Quitar
                  </button>
                </div>
                <div className="gpx-stats">
                  <span>{formatDistance(route.distanceM)}</span>
                  {route.durationMs !== undefined && <span>{formatDuration(route.durationMs)}</span>}
                  {route.ascentM !== undefined && <span>↑ {Math.round(route.ascentM)} m</span>}
                  <span>{route.points.length} puntos</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
