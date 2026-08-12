import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync(new URL('../../public/app.js', import.meta.url), 'utf8');

describe('PWA offline runtime', () => {
  it('initializes the persistent runtime database and boot state', () => {
    expect(app).toContain("indexedDB.open(DATABASE_NAME, DATABASE_VERSION)");
    expect(app).toContain("createObjectStore('secure-storage'");
    expect(app).toContain("createObjectStore(RUNTIME_STORE");
    expect(app).toContain('store.put(next)');
    expect(app).toContain('bootCount: current.bootCount + 1');
    expect(app).toContain('window.healthCompanionRuntime');
  });

  it('registers the service worker before exposing runtime readiness', () => {
    expect(app).toContain("navigator.serviceWorker.register('/sw.js', { scope: '/' })");
    expect(app).toContain('const registration = await registerServiceWorker();');
    expect(app).toContain('const state = await persistBootState();');
    expect(app).toContain("<span>ready</span>");
  });
});
