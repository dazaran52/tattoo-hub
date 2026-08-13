import { MetadataRoute } from 'next'
import { locales } from '../i18n/request'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://tattoo-hub.xyz'

  // Core pages (only public pages to avoid 307 redirects for Googlebot)
  const pages = [
    '',
    '/login'
  ]

  const sitemapEntries: MetadataRoute.Sitemap = []

  // Generate an entry for each page and locale combination
  pages.forEach((page) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: page === '' ? 1 : 0.8,
      })
    })
  })

  return sitemapEntries
}
