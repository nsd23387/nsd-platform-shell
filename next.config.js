/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['*'],
  async redirects() {
    // Retired SEO routes 301 → the consolidated four-area IA (Command Center,
    // Performance, Competitors, Results). Keeps old bookmarks/links resolving.
    const seoRetired = [
      ['pages', 'performance'],
      ['content', 'performance'],
      ['content-scores', 'performance'],
      ['internal-links', 'performance'],
      ['schema', 'performance'],
      ['clusters', 'performance'],
      ['opportunities', 'performance'],
      ['serp-features', 'competitors'],
      ['competitive', 'competitors'],
      ['backlinks', 'competitors'],
      ['actions', ''],
      ['execution-log', 'results'],
      ['suppressed', 'results'],
      ['attribution', 'results'],
      ['outcomes', 'results'],
      ['signals', 'results'],
    ].map(([from, to]) => ({
      source: `/dashboard/seo/${from}`,
      destination: to ? `/dashboard/seo/${to}` : '/dashboard/seo',
      permanent: true,
    }));
    return [
      {
        source: '/',
        destination: '/sales-engine/home',
        permanent: false,
      },
      ...seoRetired,
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
