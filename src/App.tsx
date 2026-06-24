import { useEffect, useMemo, useState } from 'react';
import { GpxImport } from './components/GpxImport';
import { InstallPrompt } from './components/InstallPrompt';
import { SegmentsList } from './components/SegmentsList';
import { SplitsTable } from './components/SplitsTable';
import { StatsGrid } from './components/StatsGrid';
import { getActiveSegment } from './lib/activity';
import { formatMeters } from './lib/format';
import { useActivityTracker } from './hooks/useActivityTracker';

function statusLabel(status: string): string {
  switch (status) {
    case 'recording':
      return 'Grabando';
    case 'paused':
      return 'Segmento parado';
    case 'finished':
      return 'Finalizada';
    default:
      return 'Lista';
  }
}

export default function App() {
  const { activity, error, storageReady, voiceEnabled, canExport, actions } = useActivityTracker();
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<'tracker' | 'mapas'>('tracker');

  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(handle);
  }, []);

  const activeSegment = getActiveSegment(activity);
  const lastPoint = useMemo(() => activeSegment?.points.at(-1), [activeSegment]);

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Ronsel · GPS</p>
          <h1>Registra tu estela</h1>
          <p className="status-pill" data-status={activity.status}>{statusLabel(activity.status)}</p>
        </div>
        <InstallPrompt />
      </header>

      <nav className="tabs" role="tablist" aria-label="Secciones">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tracker'}
          className={tab === 'tracker' ? 'tab is-active' : 'tab'}
          onClick={() => setTab('tracker')}
        >
          Actividad
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'mapas'}
          className={tab === 'mapas' ? 'tab is-active' : 'tab'}
          onClick={() => setTab('mapas')}
        >
          Mapas GPX
        </button>
      </nav>

      {tab === 'tracker' ? (
        <>
          <section className="panel">
        <label className="field">
          <span>Nombre de la actividad</span>
          <input
            value={activity.name}
            placeholder="Ej. Rodaje suave martes"
            onChange={(event) => actions.rename(event.target.value)}
          />
        </label>

        <StatsGrid activity={activity} now={now} />

        {!storageReady && <p className="gps-note">Cargando actividad guardada desde IndexedDB…</p>}

        {error && <p className="error">{error}</p>}

        {lastPoint && (
          <p className="gps-note">
            Último punto: precisión {lastPoint.accuracy ? formatMeters(lastPoint.accuracy) : 'n/d'} · {new Date(lastPoint.time).toLocaleTimeString('es-ES')}
          </p>
        )}

        <div className="actions">
          {(activity.status === 'idle' || activity.status === 'finished') && (
            <button type="button" className="primary" disabled={!storageReady} onClick={actions.startActivity}>
              Nueva actividad
            </button>
          )}

          {activity.status === 'paused' && (
            <button type="button" className="primary" disabled={!storageReady} onClick={actions.startSegment}>
              Iniciar segmento
            </button>
          )}

          {activity.status === 'recording' && (
            <button type="button" className="warning" disabled={!storageReady} onClick={actions.stopSegment}>
              Parar segmento
            </button>
          )}

          {(activity.status === 'recording' || activity.status === 'paused') && (
            <button type="button" className="danger" disabled={!storageReady} onClick={actions.finish}>
              Finalizar
            </button>
          )}

          <button type="button" className="secondary" disabled={!storageReady || !canExport} onClick={actions.exportGpx}>
            Exportar GPX
          </button>

          <button type="button" className="ghost" disabled={!storageReady} onClick={actions.reset}>
            Reiniciar
          </button>
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            disabled={!storageReady}
            checked={voiceEnabled}
            onChange={(event) => actions.setVoiceEnabled(event.target.checked)}
          />
          <span>Avisos por voz al completar cada km</span>
        </label>
      </section>

      <section className="panel two-column">
        <div>
          <h2>Parciales</h2>
          <SplitsTable splits={activity.splits} />
        </div>
        <div>
          <h2>Segmentos</h2>
          <SegmentsList segments={activity.segments} activeSegmentId={activity.activeSegmentId} now={now} />
        </div>
      </section>

          <footer>
            <p>
              Consejo: prueba al aire libre. Los primeros segundos de GPS pueden tener poca precisión; esta versión usa siempre la lectura más reciente del GPS y descarta puntos con precisión peor de 50 m, saltos imposibles y la deriva por mala señal.
            </p>
            <p>
              Background: instala la app («Añadir a pantalla de inicio») y mantén la pantalla encendida —se activa un bloqueo de pantalla automático mientras grabas—. Por seguridad del sistema operativo, el navegador suspende el GPS si cierras por completo la app; mantenla abierta o minimizada para no perder puntos.
            </p>
          </footer>
        </>
      ) : (
        <GpxImport />
      )}
    </main>
  );
}
