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
    request.onerror = () => reject(request.error ?? new Error('IndexedDB konnte nicht geöffnet werden.'));
  });
}

async function getBootState() {
  const database = await openRuntimeDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RUNTIME_STORE, 'readonly');
    const request = transaction.objectStore(RUNTIME_STORE).get(BOOT_STATE_ID);
    request.onsuccess = () => resolve(request.result ?? { id: BOOT_STATE_ID, ready: false, bootCount: 0 });
    request.onerror = () => reject(request.error ?? new Error('Lesevorgang fehlgeschlagen.'));
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
    request.onerror = () => reject(request.error ?? new Error('Lesevorgang fehlgeschlagen.'));
    transaction.oncomplete = () => { database.close(); resolve(next); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Speichervorgang fehlgeschlagen.')); };
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
  const status = document.querySelector('#runtime-status span:last-child');
  if (status) status.textContent = navigator.onLine ? 'Bereit' : 'Offline bereit';
}

function updateNavigation() {
  const hash = window.location.hash.slice(1) || 'home';
  document.querySelectorAll('[data-nav]').forEach((link) => link.classList.toggle('active', link.dataset.nav === hash));
}

function clearInputErrors(form) {
  form.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });
  form.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
}

function setInputError(input, message, errorId) {
  input?.setAttribute('aria-invalid', 'true');
  const error = document.getElementById(errorId ?? `${input.id}-error`);
  if (error) error.textContent = message;
}

function validateHealthInput(form) {
  clearInputErrors(form);
  const value = form.elements.value;
  const occurredAt = form.elements.occurredAt;
  const severityInput = form.querySelector('input[name="severity"]:checked');
  const symptom = value.value.trim();
  let valid = true;
  if (!symptom) { setInputError(value, 'Beschreibe deine aktuelle Beschwerde.'); valid = false; }
  if (symptom.length > 500) { setInputError(value, 'Die Beschreibung darf höchstens 500 Zeichen enthalten.'); valid = false; }
  if (!severityInput) { setInputError(form.querySelector('input[name="severity"]'), 'Wähle die Stärke deiner Beschwerde.', 'health-severity-error'); valid = false; }
  if (occurredAt.value && !Number.isFinite(new Date(occurredAt.value).getTime())) { setInputError(occurredAt, 'Gib einen gültigen Zeitpunkt an.'); valid = false; }
  return { valid, symptom, severity: Number(severityInput?.value ?? 0) };
}

function formatRiskPresentation(presentation) {
  if (!presentation) return { level: 'Keine akute Warnstufe erkannt', summary: 'Für diese Eingabe liegt keine Risikobewertung vor.', action: 'Beobachte den Verlauf und beachte Veränderungen.' };
  return {
    level: presentation.level ?? presentation.title ?? 'Einschätzung',
    summary: presentation.summary ?? presentation.message ?? '',
    action: presentation.action ?? presentation.guidance ?? '',
  };
}

function renderAssessment(payload) {
  const section = document.getElementById('result');
  const card = document.getElementById('risk-result');
  if (!card || !section) return;
  const result = formatRiskPresentation(payload?.presentation);
  card.replaceChildren();
  const title = document.createElement('h3');
  title.textContent = result.level;
  const summary = document.createElement('p');
  summary.textContent = result.summary;
  const action = document.createElement('p');
  action.textContent = result.action;
  card.append(title, summary, action);
  section.hidden = false;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTimeline(entries) {
  const container = document.getElementById('timeline');
  const count = document.getElementById('history-count');
  if (!container) return;
  container.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const strong = document.createElement('strong');
    strong.textContent = 'Dein Verlauf erscheint hier.';
    const text = document.createElement('p');
    text.textContent = 'Erfasste Beschwerden werden nach erfolgreicher Speicherung chronologisch angezeigt.';
    empty.append(strong, text);
    container.append(empty);
    if (count) count.textContent = 'Noch keine Einträge';
    return;
  }
  const list = document.createElement('ol');
  for (const entry of entries) {
    const item = document.createElement('li');
    const time = document.createElement('time');
    const occurredAt = new Date(entry.occurredAt);
    time.dateTime = occurredAt.toISOString();
    time.textContent = occurredAt.toLocaleString('de-DE');
    const description = document.createElement('span');
    description.textContent = `${entry.value?.symptom ?? entry.type} · Stärke ${entry.value?.severity ?? '–'}/10`;
    item.append(time, description);
    list.append(item);
  }
  container.append(list);
  if (count) count.textContent = `${entries.length} Einträge`;
}

async function loadBrowserDomain() {
  try {
    window.healthCompanionDomain = await import('/src/browser/healthCompanionBrowser.ts');
    await refreshTimeline();
  } catch (error) {
    setText('runtime-error', error instanceof Error ? error.message : 'Health-Domain konnte nicht geladen werden.');
  }
}

async function refreshTimeline() {
  const domain = window.healthCompanionDomain;
  if (!domain?.loadTimeline) return;
  try { renderTimeline(await domain.loadTimeline()); }
  catch (error) { setText('runtime-error', error instanceof Error ? error.message : 'Verlauf konnte nicht geladen werden.'); }
}

function setupHealthInput() {
  const form = document.getElementById('health-input-form');
  if (!form) return;
  const status = document.getElementById('health-input-status');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (status) status.textContent = '';
    const input = validateHealthInput(form);
    if (!input.valid) {
      if (status) status.textContent = 'Bitte korrigiere die markierten Angaben.';
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const domain = window.healthCompanionDomain;
    if (!domain?.recordComplaint) {
      if (status) status.textContent = 'Die sichere Gesundheitsfunktion ist noch nicht verfügbar.';
      return;
    }
    const occurredAt = form.elements.occurredAt.value ? new Date(form.elements.occurredAt.value).getTime() : undefined;
    try {
      const payload = await domain.recordComplaint(input.symptom, input.severity, occurredAt);
      renderAssessment(payload);
      await refreshTimeline();
      if (status) status.textContent = 'Beschwerde sicher gespeichert.';
      form.reset();
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : 'Die Beschwerde konnte nicht gespeichert werden.';
    }
  });
}

async function startRuntime() {
  const registration = await registerServiceWorker();
  const state = await persistBootState();
  const runtimeStatus = document.querySelector('#runtime-status');
  if (runtimeStatus) runtimeStatus.innerHTML = '<span class="status-dot"></span><span>Bereit</span>';
  updateConnectionStatus();
  window.healthCompanionRuntime = Object.freeze({ getBootState: async () => getBootState(), serviceWorkerRegistered: Boolean(registration) });
  await loadBrowserDomain();
}

window.healthCompanionRuntime = Object.freeze({ getBootState: async () => getBootState() });
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
window.addEventListener('hashchange', updateNavigation);
updateConnectionStatus();
updateNavigation();
setupHealthInput();
startRuntime().catch((error) => {
  const runtimeStatus = document.querySelector('#runtime-status');
  if (runtimeStatus) runtimeStatus.innerHTML = '<span class="status-dot error"></span><span>Fehler</span>';
  setText('runtime-error', error instanceof Error ? error.message : 'Runtime initialization failed');
});
