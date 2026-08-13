import { test, expect } from '@playwright/test';

test('accessibility and responsive regression', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page).toHaveTitle('Health Companion');
  await expect(page.locator('main#main-content')).toHaveAttribute('tabindex', '-1');
  await expect(page.locator('.skip-link')).toHaveAttribute('href', '#main-content');
  await expect(page.locator('nav[aria-label="Hauptnavigation"]')).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h2')).toHaveCount(4);

  const navLinks = page.locator('.nav-link');
  await expect(navLinks).toHaveCount(3);
  for (let index = 0; index < await navLinks.count(); index += 1) {
    const box = await navLinks.nth(index).boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const interactiveControls = page.locator('a, button, input');
  for (let index = 0; index < await interactiveControls.count(); index += 1) {
    await expect(interactiveControls.nth(index)).toBeVisible();
  }

  await page.locator('.skip-link').focus();
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main-content')).toBeFocused();

  await page.waitForFunction(() => Boolean(window.healthCompanionDomain?.recordComplaint));
  const form = page.locator('#health-input-form');
  await form.locator('[data-testid="health-input-submit"]').click();
  await expect(page.locator('#health-value')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#health-severity-error')).toHaveText('Wähle die Stärke deiner Beschwerde.');
  await expect(page.locator('#health-value-error')).toHaveText('Beschreibe deine aktuelle Beschwerde.');
  await expect(page.locator('#health-input-status')).toHaveText('Bitte korrigiere die markierten Angaben.');
  await expect(page.locator('#health-value')).toBeFocused();

  await page.locator('#health-value').fill('Routinebeschwerde');
  await page.locator('input[name="severity"][value="4"]').check();
  await form.locator('[data-testid="health-input-submit"]').click();
  await expect(page.locator('#health-input-status')).toHaveText('Beschwerde sicher gespeichert.');
  await expect(page.locator('#health-value')).not.toHaveAttribute('aria-invalid', 'true');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('mobile viewport remains usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  await expect(page.locator('#health-input-form')).toBeVisible();
  await expect(page.locator('[data-testid="health-input-submit"]')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const submitBox = await page.locator('[data-testid="health-input-submit"]').boundingBox();
  expect(submitBox).not.toBeNull();
  expect(submitBox.width).toBeGreaterThanOrEqual(44);
  expect(submitBox.height).toBeGreaterThanOrEqual(44);
});
