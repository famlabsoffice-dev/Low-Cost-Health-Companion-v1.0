const { test, expect } = require('@playwright/test');

test('health complaint flows through assessment, persistence and timeline after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#health-input-form')).toBeVisible();
  await page.locator('#health-input-form textarea[name="value"]').fill('Atemnot');
  await page.locator('#health-input-form input[name="severity"][value="7"]').check();
  await page.locator('#health-input-form button[type="submit"]').click();
  await expect(page.locator('#health-input-status')).toContainText('sicher gespeichert');
  await expect(page.locator('#health-risk-result')).toBeVisible();
  await expect(page.locator('#health-risk-result')).toContainText(/Atem|Risiko|Hilfe|Einschätzung/i);
  await expect(page.locator('#health-timeline-list')).toContainText('Atemnot');
  await page.reload();
  await expect(page.locator('#health-timeline-list')).toContainText('Atemnot');
});
