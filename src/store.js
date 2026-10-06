// Device-local persistence (localStorage). Every access is wrapped because
// storage can be unavailable (private mode, blocked site data, quota).

const MOVEMENTS_KEY = 'cota.movements.v1';
const SNAPSHOT_KEY = 'cota.snapshot.v1';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadMovements = () => read(MOVEMENTS_KEY, []);
export const saveMovements = (movements) => write(MOVEMENTS_KEY, movements);

/** Last server snapshot, so the app still opens without a connection. */
export const loadCachedSnapshot = () => read(SNAPSHOT_KEY, null);
export const cacheSnapshot = (snapshot) => write(SNAPSHOT_KEY, { ...snapshot, cachedAt: new Date().toISOString() });

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
