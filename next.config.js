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
    // Only emit the activity-spine rewrite when an upstream is explicitly
    // configured. A hardcoded localhost fallback would silently misroute
    // production traffic on Vercel if the env var is unset. When unset,
    // requests fall through to the in-repo `app/api/activity-spine/**`
    // route handlers, which is the correct production path.
    if (!process.env.ACTIVITY_SPINE_API_URL) return [];
    return [
      {
        source: '/api/activity-spine/:path*',
        destination: `${process.env.ACTIVITY_SPINE_API_URL.replace(/\/$/, '')}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
