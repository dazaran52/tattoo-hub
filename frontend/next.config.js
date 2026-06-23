/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  customWorkerDir: 'worker',
})

const nextConfig = {
  output: 'standalone',
  images: {
    domains: [],
  },
  async redirects() {
    return [
      {
        source: '/settings',
        destination: '/profile',
        permanent: true,
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

module.exports = withPWA(nextConfig)
