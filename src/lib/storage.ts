import type { Activity } from '../types/activity';

const DB_NAME = 'runwalk-pwa-db';
const DB_VERSION = 1;
const META_STORE = 'meta';
const ACTIVITIES_STORE = 'activities';

const CURRENT_KEY = 'runwalk.currentActivity.v1';
const VOICE_KEY = 'runwalk.voiceEnabled.v1';
const MIGRATION_KEY = 'runwalk.localStorageMigration.v1';
const LEGACY_HISTORY_KEY = 'runwalk.history.v1';

interface MetaRecord<T = unknown> {
  key: string;
  value: T;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let migrationPromise: Promise<void> | null = null;

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) return Promise.reject(new Error('IndexedDB no está disponible.'));
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(ACTIVITIES_STORE)) {
        const store = db.createObjectStore(ACTIVITIES_STORE, { keyPath: 'id' });
        store.createIndex('endedAt', 'endedAt', { unique: false });
        store.createIndex('startedAt', 'startedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
    request.onblocked = () => console.warn('La apertura de IndexedDB está bloqueada por otra pestaña.');
  });

  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Operación IndexedDB fallida.'));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | Promise<T> | T
): Promise<T> {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let settled = false;
    let operationResult: T | undefined;

    transaction.oncomplete = () => {
      if (!settled) resolve(operationResult as T);
    };
    transaction.onerror = () => reject(transaction.error ?? new Error('Transacción IndexedDB fallida.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Transacción IndexedDB abortada.'));

    try {
      const result = operation(store);

      if (result instanceof IDBRequest) {
        result.onsuccess = () => {
          operationResult = result.result;
        };
        result.onerror = () => {
          settled = true;
          reject(result.error ?? new Error('Operación IndexedDB fallida.'));
        };
        return;
      }

      if (result instanceof Promise) {
        result.then((value) => {
          operationResult = value;
        }).catch((error) => {
          settled = true;
          transaction.abort();
          reject(error);
        });
        return;
      }

      operationResult = result;
    } catch (error) {
      settled = true;
      transaction.abort();
      reject(error);
    }
  });
}

async function getMeta<T>(key: string): Promise<T | null> {
  const record = await withStore<MetaRecord<T> | undefined>(META_STORE, 'readonly', (store) => store.get(key));
  return record?.value ?? null;
}

async function setMeta<T>(key: string, value: T): Promise<void> {
  await withStore<IDBValidKey>(META_STORE, 'readwrite', (store) => store.put({ key, value } satisfies MetaRecord<T>));
}

async function deleteMeta(key: string): Promise<void> {
  await withStore<undefined>(META_STORE, 'readwrite', (store) => store.delete(key));
}

async function migrateFromLocalStorageOnce(): Promise<void> {
  if (!hasLocalStorage()) return;
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const alreadyMigrated = await getMeta<boolean>(MIGRATION_KEY);
    if (alreadyMigrated) return;

    const currentActivity = safeParse<Activity>(localStorage.getItem(CURRENT_KEY));
    const history = safeParse<Activity[]>(localStorage.getItem(LEGACY_HISTORY_KEY)) ?? [];
    const voiceEnabled = safeParse<boolean>(localStorage.getItem(VOICE_KEY));

    if (currentActivity) await setMeta(CURRENT_KEY, currentActivity);
    if (typeof voiceEnabled === 'boolean') await setMeta(VOICE_KEY, voiceEnabled);

    await Promise.all(
      history
        .filter((activity) => activity?.id)
        .map((activity) => withStore<IDBValidKey>(ACTIVITIES_STORE, 'readwrite', (store) => store.put(activity)))
    );

    await setMeta(MIGRATION_KEY, true);
  })().catch((error) => {
    console.warn('No se pudo migrar localStorage a IndexedDB.', error);
  });

  return migrationPromise;
}

function sortActivitiesNewestFirst(a: Activity, b: Activity): number {
  const aTime = a.endedAt ?? a.startedAt ?? '';
  const bTime = b.endedAt ?? b.startedAt ?? '';
  return bTime.localeCompare(aTime);
}

export async function loadCurrentActivity(): Promise<Activity | null> {
  if (!hasIndexedDb()) return safeParse<Activity>(localStorage.getItem(CURRENT_KEY));
  await migrateFromLocalStorageOnce();
  return getMeta<Activity>(CURRENT_KEY);
}

export async function saveCurrentActivity(activity: Activity): Promise<void> {
  if (!hasIndexedDb()) {
    if (hasLocalStorage()) localStorage.setItem(CURRENT_KEY, JSON.stringify(activity));
    return;
  }
  await setMeta(CURRENT_KEY, activity);
}

export async function clearCurrentActivity(): Promise<void> {
  if (!hasIndexedDb()) {
    if (hasLocalStorage()) localStorage.removeItem(CURRENT_KEY);
    return;
  }
  await deleteMeta(CURRENT_KEY);
}

export async function loadActivityHistory(): Promise<Activity[]> {
  if (!hasIndexedDb()) return safeParse<Activity[]>(localStorage.getItem(LEGACY_HISTORY_KEY)) ?? [];
  await migrateFromLocalStorageOnce();
  const activities = await withStore<Activity[]>(ACTIVITIES_STORE, 'readonly', (store) => store.getAll());
  return activities.sort(sortActivitiesNewestFirst).slice(0, 30);
}

export async function saveFinishedActivity(activity: Activity): Promise<void> {
  if (!hasIndexedDb()) {
    if (!hasLocalStorage()) return;
    const history = safeParse<Activity[]>(localStorage.getItem(LEGACY_HISTORY_KEY)) ?? [];
    const next = [activity, ...history.filter((item) => item.id !== activity.id)].slice(0, 30);
    localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(next));
    return;
  }

  await withStore<IDBValidKey>(ACTIVITIES_STORE, 'readwrite', (store) => store.put(activity));
}

export async function loadVoiceEnabled(): Promise<boolean> {
  if (!hasIndexedDb()) {
    const value = safeParse<boolean>(localStorage.getItem(VOICE_KEY));
    return value ?? true;
  }
  await migrateFromLocalStorageOnce();
  const value = await getMeta<boolean>(VOICE_KEY);
  return value ?? true;
}

export async function saveVoiceEnabled(enabled: boolean): Promise<void> {
  if (!hasIndexedDb()) {
    if (hasLocalStorage()) localStorage.setItem(VOICE_KEY, JSON.stringify(enabled));
    return;
  }
  await setMeta(VOICE_KEY, enabled);
}

export async function deleteFinishedActivity(activityId: string): Promise<void> {
  if (!hasIndexedDb()) {
    if (!hasLocalStorage()) return;
    const history = safeParse<Activity[]>(localStorage.getItem(LEGACY_HISTORY_KEY)) ?? [];
    localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(history.filter((activity) => activity.id !== activityId)));
    return;
  }

  await withStore<undefined>(ACTIVITIES_STORE, 'readwrite', (store) => store.delete(activityId));
}
