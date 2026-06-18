import { useEffect, useRef } from 'react';

export function useWakeLock(enabled: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function releaseLock() {
      if (!lockRef.current) return;
      try {
        await lockRef.current.release();
      } catch {
        // Some browsers throw if the lock has already been released.
      } finally {
        lockRef.current = null;
      }
    }

    async function requestLock() {
      if (!enabled || !navigator.wakeLock || document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await lock.release();
          return;
        }
        lockRef.current = lock;
        lock.addEventListener('release', () => {
          if (lockRef.current === lock) lockRef.current = null;
        });
      } catch {
        // Wake Lock is progressive enhancement: tracking still works without it.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void requestLock();
      }
    }

    if (enabled) {
      void requestLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      void releaseLock();
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseLock();
    };
  }, [enabled]);
}
