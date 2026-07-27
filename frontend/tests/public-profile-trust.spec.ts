import { expect, Page, test } from '@playwright/test'

const baseMaster = {
  id: 'master-1',
  username: 'trust-artist',
  display_name: 'Anna Ink',
  bio: 'Fine-line tattoo artist',
  portfolio_url: null,
  city_ids: ['prague-id'],
  is_verified_master: true,
  certificate_status: 'approved',
  portfolio_posts: [],
  theme: 'dark',
  avatar_url: null,
  rating: 4.9,
  review_count: 23,
}

async function mockPublicProfile(
  page: Page,
  masterOverrides: Partial<typeof baseMaster> = {},
  citiesResponse: { status?: number; body?: unknown } = {
    body: [{ id: 'prague-id', name_ru: 'Прага', name_en: 'Prague' }],
  },
) {
  await page.addInitScript(() => {
    localStorage.setItem('app_lang', 'ru')
    localStorage.setItem('cookie_consent', 'accepted')
  })

  await page.route(/\/api\/public\/master\/trust-artist$/, route =>
    route.fulfill({ json: { ...baseMaster, ...masterOverrides } }),
  )
  await page.route(/\/api\/public\/master\/trust-artist\/reviews$/, route =>
    route.fulfill({ json: [] }),
  )
  await page.route(/\/api\/locations\/cities$/, route =>
    route.fulfill({
      status: citiesResponse.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(citiesResponse.body || []),
    }),
  )
  await page.route(/\/api\/leads\/public\/master\/trust-artist\/unavailable-dates$/, route =>
    route.fulfill({ json: [] }),
  )
}

test.describe('public master trust experience', () => {
  test('shows verified identity, resolved city and what happens next', async ({ page }) => {
    await mockPublicProfile(page)
    await page.goto('/book/trust-artist')

    await expect(page.getByRole('heading', { name: 'Anna Ink' })).toBeVisible()
    await expect(page.getByLabel('Сертификат об обучении проверен Tattoo HUB')).toBeVisible()
    await expect(page.getByText('Прага', { exact: true })).toBeVisible()
    await expect(page.getByText('4.9', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Что произойдет после заявки' })).toBeVisible()
    await expect(page.getByText(/не подтверждает сеанс автоматически/i)).toBeVisible()
  })

  test('does not claim verification or expose raw city ids', async ({ page }) => {
    await mockPublicProfile(page, {
      display_name: 'New Artist',
      is_verified_master: false,
      certificate_status: 'not_submitted',
      city_ids: ['unknown-city-id'],
      review_count: 0,
    }, { body: [] })
    await page.goto('/book/trust-artist')

    await expect(page.getByRole('heading', { name: 'New Artist' })).toBeVisible()
    await expect(page.getByLabel('Сертификат об обучении проверен Tattoo HUB')).toHaveCount(0)
    await expect(page.getByText('unknown-city-id')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Что произойдет после заявки' })).toBeVisible()
  })

  test('keeps booking usable when the city lookup fails', async ({ page }) => {
    await mockPublicProfile(page, {}, { status: 500, body: { detail: 'failed' } })
    await page.goto('/book/trust-artist')

    await expect(page.getByRole('button', { name: 'Запись на сеанс' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Что произойдет после заявки' })).toBeVisible()
    await expect(page.getByText('prague-id')).toHaveCount(0)
  })
})
