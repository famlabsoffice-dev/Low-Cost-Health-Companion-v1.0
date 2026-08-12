const DATABASE_NAME = 'low-cost-health-companion';
const DATABASE_VERSION = 2;
const RUNTIME_STORE = 'runtime';
const BOOT_STATE_ID = 'boot';

function openRuntimeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('secure-storage')) database.createObjectStore('secure-storage', { keyPath: 'id' });
      if (!database.objectStoreNames.contains(RUNTIME_STORE)) database.createObjectStore(RUNTIME_STORE, { keyPath: 'id' });
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
    transaction.oncomplete = () => database.close();
  });
}

async function persistBootState() {
  const database = await openRuntimeDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RUNTIME_STORE, 'readwrite');
    const store = transaction.objectStore(RUNTIME_STORE);
    const request = store.get(BOOT_STATE_ID);
    let next;
    request.onsuccess = () => {
      const current = request.result ?? { id: BOOT_STATE_ID, ready: false, bootCount: 0 };
      next = { id: BOOT_STATE_ID, ready: true, bootCount: current.bootCount + 1, lastBootAt: new Date().toISOString() };
      store.put(next);
    };
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
    transaction.oncomplete = () => { database.close(); resolve(next); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('IndexedDB write failed')); };
  });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js', { scope: '/' }); } catch { return null; }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function updateConnectionStatus() {
  setText('connection-status', navigator.onLine ? 'Online' : 'Offline');
}

function updateNavigation() {
  const hash = window.location.hash.slice(1) || 'overview';
  document.querySelectorAll('[data-nav]').forEach((link) => link.classList.toggle('active', link.dataset.nav === hash));
}

async function startRuntime() {
  const registration = await registerServiceWorker();
  const state = await persistBootState();
  const runtimeStatus = document.querySelector('#runtime-status');
  if (runtimeStatus) runtimeStatus.innerHTML = '<span class="status-dot"></span><span>Ready</span>';
  setText('connection-status', navigator.onLine ? 'Online' : 'Offline');
  setText('service-worker-status', registration ? 'Registered' : 'Unavailable');
  setText('boot-count', String(state.bootCount));
  setText('last-boot', new Date(state.lastBootAt).toLocaleString());
  window.healthCompanionRuntime = Object.freeze({ getBootState: async () => getBootState() });
}

window.healthCompanionRuntime = Object.freeze({ getBootState: async () => getBootState() });
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
window.addEventListener('hashchange', updateNavigation);
updateConnectionStatus();
updateNavigation();
startRuntime().catch((error) => {
  const runtimeStatus = document.querySelector('#runtime-status');
  if (runtimeStatus) runtimeStatus.innerHTML = '<span class="status-dot error"></span><span>Runtime error</span>';
  setText('runtime-error', error instanceof Error ? error.message : 'Runtime initialization failed');
});
