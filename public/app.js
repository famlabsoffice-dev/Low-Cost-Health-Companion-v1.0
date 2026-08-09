const DATABASE_NAME = 'low-cost-health-companion';
const DATABASE_VERSION = 2;
const RUNTIME_STORE = 'runtime';
const BOOT_STATE_ID = 'boot';

function openRuntimeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('secure-storage')) {
        database.createObjectStore('secure-storage', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(RUNTIME_STORE)) {
        database.createObjectStore(RUNTIME_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

async function getBootState() {
  const database = await openRuntimeDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RUNTIME_STORE, 'readonly');
    const request = transaction.objectStore(RUNTIME_STORE).get(BOOT_STATE_ID);
    request.onsuccess = () => resolve(request.result ?? { id: BOOT_STATE_ID, ready: false, bootCount: 0 });
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
  });
}

async function persistBootState() {
  const current = await getBootState();
  const next = {
    id: BOOT_STATE_ID,
    ready: true,
    bootCount: current.bootCount + 1,
    lastBootAt: new Date().toISOString(),
  };
  const database = await openRuntimeDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(RUNTIME_STORE, 'readwrite');
    transaction.objectStore(RUNTIME_STORE).put(next);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
  });
  return next;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

async function startRuntime() {
  await registerServiceWorker();
  const state = await persistBootState();
  document.querySelector('#runtime-status').textContent = state.ready ? 'ready' : 'starting';
  window.healthCompanionRuntime = Object.freeze({
    getBootState: async () => getBootState(),
  });
}

window.healthCompanionRuntime = Object.freeze({
  getBootState: async () => getBootState(),
});

startRuntime().catch(() => {
  document.querySelector('#runtime-status').textContent = 'error';
});
