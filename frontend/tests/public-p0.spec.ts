import { test, expect, Page } from '@playwright/test'

async function triggerInstallPrompt(page: Page) {
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string }>
    }
    event.prompt = async () => {}
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    window.dispatchEvent(event)
  })
}

test.describe('P0 public funnel regressions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('app_lang', 'ru')
      localStorage.setItem('cookie_consent', 'accepted')
    })
  })

  test('keeps the selected locale when opening client registration', async ({ page }) => {
    await page.goto('/login?register=client')

    await expect(page.getByRole('button', { name: /вход/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /регистрация/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /клиент/i })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('language'))).toBe('ru')
  })

  test('updates mounted legacy widgets when the language changes', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('app_lang', 'cs')
      localStorage.setItem('language', 'cs')
    })
    await page.goto('/login')

    await page.locator('div.fixed.bottom-6.right-6 > button').click()
    await expect(page.getByText('Podpora', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /cz/i }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByText('Support Service', { exact: true })).toBeVisible()
  })

  test('does not show the PWA prompt on quick-lead and public booking routes', async ({ page }) => {
    await page.goto('/new-lead')
    await expect(page.getByRole('heading', { name: 'Опиши свою идею' })).toBeVisible()
    await triggerInstallPrompt(page)
    await page.waitForTimeout(100)
    await expect(page.getByText('Установить приложение')).toHaveCount(0)

    await page.goto('/book/dazaran')
    await expect(page).toHaveURL(/\/book\/dazaran/)
    await page.waitForLoadState('networkidle')
    await triggerInstallPrompt(page)
    await page.waitForTimeout(100)
    await expect(page.getByText('Установить приложение')).toHaveCount(0)
  })

  test('quick lead accepts an image and shows a removable preview', async ({ page }) => {
    await page.goto('/new-lead')

    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveCount(1)
    await fileInput.setInputFiles({
      name: 'reference.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    })

    await expect(page.getByAltText('reference.png')).toBeVisible()
    const removeButton = page.getByRole('button', { name: /удалить reference\.png/i })
    await expect(removeButton).toBeVisible()
    await removeButton.click()
    await expect(page.getByAltText('reference.png')).toHaveCount(0)
  })

  test('localizes the cookie banner using the selected locale', async ({ browser }) => {
    const context = await browser.newContext()
    await context.addInitScript(() => {
      localStorage.setItem('app_lang', 'ru')
      localStorage.removeItem('cookie_consent')
    })
    const cookiePage = await context.newPage()
    await cookiePage.goto('http://localhost:3000/')

    await expect(cookiePage.getByText(/Мы используем файлы cookie/)).toBeVisible({ timeout: 4000 })
    await expect(cookiePage.getByRole('button', { name: 'Понятно' })).toBeVisible()
    await context.close()
  })
})
