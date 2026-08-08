import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/settings',
        '/messages',
        '/top-up',
        '/update-password',
        '/onboarding',
        '/admin',
        '/analytics'
      ],
    },
    sitemap: 'https://tattoo-hub.xyz/sitemap.xml',
  }
}
