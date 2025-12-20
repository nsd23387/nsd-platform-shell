/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy Activity Spine API calls in development
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
