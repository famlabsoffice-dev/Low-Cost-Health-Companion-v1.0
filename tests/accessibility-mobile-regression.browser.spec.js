import { test, expect } from '@playwright/test';

test('accessibility and responsive regression', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Low Cost Health Companion');
  await expect(page.locator('main#main-content')).toHaveAttribute('tabindex', '-1');
  await expect(page.locator('.skip-link')).toHaveAttribute('href', '#main-content');
  await expect(page.locator('nav[aria-label="Primary navigation"]')).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h2')).toHaveCount(3);

  const navLinks = page.locator('.nav-link');
  await expect(navLinks).toHaveCount(4);
  for (let index = 0; index < await navLinks.count(); index += 1) {
    const box = await navLinks.nth(index).boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const interactiveControls = page.locator('a, button, input, select');
  for (let index = 0; index < await interactiveControls.count(); index += 1) {
    await expect(interactiveControls.nth(index)).toBeVisible();
  }

  await page.locator('.skip-link').focus();
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main-content')).toBeFocused();

  const form = page.locator('#health-input-form');
  await form.locator('[data-testid="health-input-submit"]').click();
  await expect(page.locator('#health-type')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#health-value')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#health-type-error')).toHaveText('Select a health input type.');
  await expect(page.locator('#health-value-error')).toHaveText('Enter a value before continuing.');
  await expect(page.locator('#health-input-status')).toHaveText('Please correct the highlighted fields.');
  await expect(page.locator('#health-type')).toBeFocused();

  await page.locator('#health-type').selectOption('note');
  await page.locator('#health-value').fill('Routine note');
  await form.locator('[data-testid="health-input-submit"]').click();
  await expect(page.locator('#health-input-status')).toHaveText('Input is valid and ready for the health-data path.');
  await expect(page.locator('#health-type')).not.toHaveAttribute('aria-invalid', 'true');
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
