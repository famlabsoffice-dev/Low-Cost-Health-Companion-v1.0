import { test, expect } from '@playwright/test';

test.describe('health input validation and error UX', () => {
  test('rejects missing required fields and focuses the first invalid field', async ({ page }) => {
    await page.goto('/#home');

    await page.getByTestId('health-input-submit').click();

    await expect(page.locator('#health-value-error')).toHaveText('Beschreibe deine aktuelle Beschwerde.');
    await expect(page.locator('#health-severity-error')).toHaveText('Wähle die Stärke deiner Beschwerde.');
    await expect(page.locator('#health-input-status')).toHaveText('Bitte korrigiere die markierten Angaben.');
    await expect(page.locator('#health-value')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#health-value')).toBeFocused();
  });

  test('accepts a complete valid input and clears validation errors', async ({ page }) => {
    await page.goto('/#home');
    await page.waitForFunction(() => Boolean(window.healthCompanionDomain?.recordComplaint));

    await page.locator('#health-value').fill('Kopfschmerzen');
    await page.locator('input[name="severity"][value="4"]').check();
    await page.locator('#health-occurred-at').fill('2026-08-12T23:45');
    await page.getByTestId('health-input-submit').click();

    await expect(page.locator('#health-value-error')).toHaveText('');
    await expect(page.locator('#health-severity-error')).toHaveText('');
    await expect(page.locator('#health-occurred-at-error')).toHaveText('');
    await expect(page.locator('#health-input-status')).toHaveText('Beschwerde sicher gespeichert.');
    await expect(page.locator('#health-value')).not.toHaveAttribute('aria-invalid', 'true');
  });
});
