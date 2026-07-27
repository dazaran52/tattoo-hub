/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: [],
  },
  async rewrites() {
    return [
      {
        // Proxy frontend API calls to the backend without exposing mixed-content requests.
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://49.13.145.179:8000'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
