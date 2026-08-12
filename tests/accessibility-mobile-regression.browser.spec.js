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

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
