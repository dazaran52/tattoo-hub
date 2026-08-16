/** @type {import('next').NextConfig} */
const defaultRuntimeCaching = require('next-pwa/cache')

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  customWorkerDir: 'worker',
  fallbacks: {
    document: '/~offline',
  },
  runtimeCaching: [
    // Backend API responses can contain private data (leads, chats, balances,
    // messages). Never let the service worker cache them - otherwise they
    // stay readable from Cache Storage even after the user logs out.
    // This rule is listed first so it wins over any broader default rule
    // below that might otherwise also match `/api/*` requests.
    {
      urlPattern: /^\/api\/.*$/i,
      handler: 'NetworkOnly',
      options: {},
    },
    ...defaultRuntimeCaching,
  ],
})

// NOTE on CSP: `script-src`/`style-src` currently need 'unsafe-inline' because
// `src/app/layout.tsx` sets the initial theme via an inline <script>, and
// Tailwind/framer-motion inject inline styles at runtime. Tightening this
// further would require a nonce-based CSP wired through middleware - tracked
// as a follow-up, not done here to avoid breaking the app without a browser
// to verify against.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.wikipedia.org https://nominatim.openstreetmap.org",
  "media-src 'self' https: blob:",
  "worker-src 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
]

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  async rewrites() {
    return [
      {
        // Проксируем запросы с фронтенда на реальный бекенд, чтобы избежать ошибки Mixed Content (HTTP over HTTPS)
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://49.13.145.179:8000'}/api/:path*`,
      },
    ]
  },
}

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

module.exports = withNextIntl(withPWA(nextConfig));
