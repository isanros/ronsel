import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  appendPosition,
  createEmptyActivity,
  DEFAULT_TRACKER_SETTINGS,
  finishActivity,
  getTotalPoints,
  startNewActivity,
  startSegment as startSegmentModel,
  stopSegment as stopSegmentModel
} from '../lib/activity';
import { announceSplit } from '../lib/announce';
import { downloadActivityGpx } from '../lib/gpx';
import {
  clearCurrentActivity,
  loadCurrentActivity,
  loadVoiceEnabled,
  saveCurrentActivity,
  saveFinishedActivity,
  saveVoiceEnabled
} from '../lib/storage';
import type { Activity } from '../types/activity';
import { useWakeLock } from './useWakeLock';

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Permiso de ubicación denegado. Activa la ubicación para esta web/app.';
    case error.POSITION_UNAVAILABLE:
      return 'La posición no está disponible. Sal al exterior o revisa el GPS.';
    case error.TIMEOUT:
      return 'El GPS ha tardado demasiado en responder. Se seguirá intentando.';
    default:
      return error.message || 'Error desconocido de geolocalización.';
  }
}

function canExport(activity: Activity): boolean {
  return getTotalPoints(activity) > 0;
}

export function useActivityTracker() {
  const [activity, setActivity] = useState<Activity>(() => createEmptyActivity());
  const [storageReady, setStorageReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const watchIdRef = useRef<number | null>(null);
  const previousSplitCountRef = useRef(activity.splits.length);

  useWakeLock(activity.status === 'recording');

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadCurrentActivity(), loadVoiceEnabled()])
      .then(([savedActivity, savedVoiceEnabled]) => {
        if (cancelled) return;
        if (savedActivity) {
          setActivity(savedActivity);
          previousSplitCountRef.current = savedActivity.splits.length;
        }
        setVoiceEnabled(savedVoiceEnabled);
      })
      .catch((storageError) => {
        console.warn('No se pudo cargar IndexedDB.', storageError);
        if (!cancelled) setError('No se pudo cargar la actividad guardada.');
      })
      .finally(() => {
        if (!cancelled) setStorageReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const handle = window.setTimeout(() => {
      saveCurrentActivity(activity).catch((storageError) => {
        console.warn('No se pudo guardar la actividad actual.', storageError);
      });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [activity, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    saveVoiceEnabled(voiceEnabled).catch((storageError) => {
      console.warn('No se pudo guardar la configuración de voz.', storageError);
    });
  }, [voiceEnabled, storageReady]);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (activity.status !== 'recording') {
      clearWatch();
      return;
    }

    if (!('geolocation' in navigator)) {
      setError('Este navegador no soporta geolocalización.');
      return;
    }

    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setError(null);
        setActivity((current) => appendPosition(current, position, DEFAULT_TRACKER_SETTINGS));
      },
      (geoError) => setError(geolocationErrorMessage(geoError)),
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000
      }
    );

    return clearWatch;
  }, [activity.status, clearWatch]);

  useEffect(() => {
    if (activity.splits.length > previousSplitCountRef.current) {
      const lastSplit = activity.splits.at(-1);
      if (lastSplit && voiceEnabled) announceSplit(lastSplit);
    }

    previousSplitCountRef.current = activity.splits.length;
  }, [activity.splits.length, voiceEnabled, activity.splits]);

  const actions = useMemo(() => ({
    startActivity: () => {
      setError(null);
      setActivity(startNewActivity(new Date()));
    },
    startSegment: () => {
      setError(null);
      setActivity((current) => startSegmentModel(current, new Date()));
    },
    stopSegment: () => {
      setActivity((current) => stopSegmentModel(current, new Date()));
    },
    finish: () => {
      setActivity((current) => {
        const finished = finishActivity(current, new Date());
        if (finished.status === 'finished') {
          saveFinishedActivity(finished).catch((storageError) => {
            console.warn('No se pudo guardar en el historial.', storageError);
          });
        }
        return finished;
      });
    },
    reset: () => {
      clearWatch();
      clearCurrentActivity().catch((storageError) => {
        console.warn('No se pudo limpiar la actividad actual.', storageError);
      });
      setError(null);
      previousSplitCountRef.current = 0;
      setActivity(createEmptyActivity());
    },
    rename: (name: string) => {
      setActivity((current) => ({ ...current, name }));
    },
    exportGpx: () => {
      if (canExport(activity)) downloadActivityGpx(activity);
    },
    setVoiceEnabled
  }), [activity, clearWatch]);

  return {
    activity,
    error,
    storageReady,
    voiceEnabled,
    canExport: canExport(activity),
    actions
  };
}
