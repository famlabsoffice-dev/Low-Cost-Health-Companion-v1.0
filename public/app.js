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
  const online = navigator.onLine;
  const status = document.querySelector('#runtime-status span:last-child');
  if (status) status.textContent = online ? 'Bereit' : 'Offline bereit';
}

function updateNavigation() {
  const hash = window.location.hash.slice(1) || 'home';
  document.querySelectorAll('[data-nav]').forEach((link) => link.classList.toggle('active', link.dataset.nav === hash));
}

function clearInputErrors(form) {
  form.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });
  form.querySelectorAll('[aria-invalid="true"]').forEach((element) => { element.removeAttribute('aria-invalid'); });
}

function setInputError(input, message, errorId) {
  input.setAttribute('aria-invalid', 'true');
  const error = document.getElementById(errorId ?? `${input.id}-error`);
  if (error) error.textContent = message;
}

function validateHealthInput(form) {
  clearInputErrors(form);
  const value = form.elements.value;
  const severity = form.elements.severity;
  const occurredAt = form.elements.occurredAt;
  let valid = true;
  const trimmedValue = value.value.trim();

  if (!trimmedValue) {
    setInputError(value, 'Beschreibe deine aktuelle Beschwerde.');
    valid = false;
  }
  if (trimmedValue.length > 500) {
    setInputError(value, 'Die Beschreibung darf höchstens 500 Zeichen enthalten.');
    valid = false;
  }
  if (!form.querySelector('input[name="severity"]:checked')) {
    setInputError(severity[0], 'Wähle die Stärke deiner Beschwerde.', 'health-severity-error');
    valid = false;
  }
  if (occurredAt.value && !Number.isFinite(new Date(occurredAt.value).getTime())) {
    setInputError(occurredAt, 'Gib einen gültigen Zeitpunkt an.');
    valid = false;
  }

  return { valid, symptom: trimmedValue, severity: Number(form.querySelector('input[name="severity"]:checked')?.value ?? 0) };
}

function setupHealthInputValidation() {
  const form = document.getElementById('health-input-form');
  if (!form) return;
  const status = document.getElementById('health-input-status');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (status) status.textContent = '';
    const result = validateHealthInput(form);
    if (!result.valid) {
      if (status) status.textContent = 'Bitte korrigiere die markierten Angaben.';
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
      return;
    }
    if (status) status.textContent = 'Angaben geprüft. Die sichere Health-Domain-Integration folgt als nächster Implementierungsschritt.';
  });
}

async function startRuntime() {
  const registration = await registerServiceWorker();
  const state = await persistBootState();
  const runtimeStatus = document.querySelector('#runtime-status');
  if (runtimeStatus) runtimeStatus.innerHTML = '<span class="status-dot"></span><span>Bereit</span>';
  updateConnectionStatus();
  setText('boot-count', String(state.bootCount));
  window.healthCompanionRuntime = Object.freeze({ getBootState: async () => getBootState(), serviceWorkerRegistered: Boolean(registration) });
}

window.healthCompanionRuntime = Object.freeze({ getBootState: async () => getBootState() });
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
window.addEventListener('hashchange', updateNavigation);
updateConnectionStatus();
updateNavigation();
setupHealthInputValidation();
startRuntime().catch((error) => {
  const runtimeStatus = document.querySelector('#runtime-status');
  if (runtimeStatus) runtimeStatus.innerHTML = '<span class="status-dot error"></span><span>Fehler</span>';
  setText('runtime-error', error instanceof Error ? error.message : 'Runtime initialization failed');
});
