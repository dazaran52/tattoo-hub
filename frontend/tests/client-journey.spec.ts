import { test, expect } from '@playwright/test';

test.describe('Client Journey', () => {
  const timestamp = Date.now();
  const testEmail = `test_client_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  test.beforeEach(async ({ page }) => {
    // Set language to Russian so we know the translations
    await page.addInitScript(() => {
      window.localStorage.setItem('language', 'ru');
    });
  });

  test('should create a quick lead and register successfully', async ({ page }) => {
    // 1. Go to homepage
    await page.goto('/');

    // 2. Click "Начать!" (landing.start_btn)
        await page.locator('button', { hasText: /Начать!|Začít!|Start/i }).first().click();
    
    // Select Client Role
    await page.locator('div').filter({ hasText: /^Для клиентов$/ }).click();

    // Click next guide
    const nextBtn = page.getByRole('button', { name: 'Понятно' }).or(page.getByRole('button', { name: 'Далее' }));
    while (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // 3. Click "Быстрая заявка"
    await page.getByRole('button', { name: 'Быстрая заявка' }).click();

    // 4. Fill out quick lead
    await page.fill('textarea', 'Хочу татуировку дракона на всю спину, стиль реализм');
    await page.getByRole('button', { name: 'Большая' }).click();
    await page.locator('div').filter({ hasText: /^Качественно$/ }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    // 5. Click Register
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

    // 6. Fill out registration
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Check "I agree to terms"
    const termsCheckbox = page.locator('input[type="checkbox"]');
    if (await termsCheckbox.count() > 0) {
      await termsCheckbox.first().check();
    }

    await page.getByRole('button', { name: 'Зарегистрироваться' }).nth(1).click();

    // 7. Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // 8. Verify that the full lead form is opened automatically
    await expect(page.getByText('Создание заявки').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('textarea').first()).toHaveValue('Хочу татуировку дракона на всю спину, стиль реализм');

    // 9. Fill out the rest of the form
    await page.getByText('Договорная цена').click();
    await page.fill('input[placeholder="Например: Прага"]', 'Прага');
    await page.fill('input[placeholder="Например: +420 123 456 789 или t.me/username"]', 't.me/test_client');
    
    // Submit
    await page.getByRole('button', { name: 'Опубликовать заявку' }).click();

    // Verify success
    await expect(page.getByText('Заявка успешно опубликована').first()).toBeVisible({ timeout: 10000 });
  });
});
