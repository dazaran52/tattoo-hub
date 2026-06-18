import { test, expect } from '@playwright/test';

test.describe('Artist Journey', () => {
  const timestamp = Date.now();
  const testEmail = `test_artist_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  test.beforeEach(async ({ page }) => {
    // Set language to Russian so we know the translations
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'ru');
    });
  });

  test('should register as artist, view leads, and try to unlock', async ({ page }) => {
    // 1. Go to homepage
    await page.goto('/');

    // 2. Click "Начать!"
        await page.locator('button', { hasText: /Начать!|Začít!|Start/i }).first().click();

    // Select Master Role
    await page.locator('div').filter({ hasText: /^Для мастеров$/ }).click();

    // Click next guide
    const nextBtn = page.getByRole('button', { name: 'Понятно' }).or(page.getByRole('button', { name: 'Далее' }));
    while (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // 3. Click registration
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

    // 4. Fill out registration
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Check "I agree to terms"
    const termsCheckbox = page.locator('input[type="checkbox"]');
    if (await termsCheckbox.count() > 0) {
      await termsCheckbox.first().check();
    }

    await page.getByRole('button', { name: 'Зарегистрироваться' }).nth(1).click();

    // 5. Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // 6. Wait for Leads Feed to load
    await expect(page.getByText('Лента заявок').first()).toBeVisible({ timeout: 15000 });
    
    // 7. Verify we see some leads or empty state
    await expect(page.getByText('Фильтры').first()).toBeVisible({ timeout: 10000 });

    // 8. Find a lead and try to unlock
    const unlockBtn = page.getByRole('button', { name: 'Открыть контакты' }).first();
    
    if (await unlockBtn.isVisible()) {
      await unlockBtn.click();
      
      // Should show insufficient funds modal since new artist has 0 balance
      await expect(page.getByText('Недостаточно средств').first()).toBeVisible();
    } else {
      // If no leads, just verify we are on the feed page
      console.log('No leads found to unlock.');
    }
  });
});
