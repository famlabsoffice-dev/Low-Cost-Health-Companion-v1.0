import { test, expect } from '@playwright/test';

test.describe('health input validation and error UX', () => {
  test('rejects missing required fields and focuses the first invalid field', async ({ page }) => {
    await page.goto('/#health');

    await page.getByTestId('health-input-submit').click();

    await expect(page.locator('#health-type-error')).toHaveText('Select a health input type.');
    await expect(page.locator('#health-value-error')).toHaveText('Enter a value before continuing.');
    await expect(page.locator('#health-input-status')).toHaveText('Please correct the highlighted fields.');
    await expect(page.locator('#health-type')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#health-type')).toBeFocused();
  });

  test('accepts a complete valid input and clears validation errors', async ({ page }) => {
    await page.goto('/#health');

    await page.locator('#health-type').selectOption('symptom');
    await page.locator('#health-value').fill('Headache');
    await page.locator('#health-occurred-at').fill('2026-08-12T23:45');
    await page.getByTestId('health-input-submit').click();

    await expect(page.locator('#health-type-error')).toHaveText('');
    await expect(page.locator('#health-value-error')).toHaveText('');
    await expect(page.locator('#health-occurred-at-error')).toHaveText('');
    await expect(page.locator('#health-input-status')).toHaveText('Input is valid and ready for the health-data path.');
    await expect(page.locator('#health-type')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#health-value')).not.toHaveAttribute('aria-invalid', 'true');
  });
});
