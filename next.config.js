/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['*'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/sales-engine/home',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/activity-spine/:path*',
        destination: `${process.env.ACTIVITY_SPINE_API_URL || 'http://localhost:3001'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
