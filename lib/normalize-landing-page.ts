/**
 * Landing Page Normalization
 *
 * Converts any combination of origin_page, origin_url, or landing_page
 * into a canonical PATH (e.g. "/custom-neon-signs/") suitable for
 * domain-agnostic joins with Search Console data.
 *
 * Priority order: origin_page > landing_page > origin_url
 *
 * Rules:
 *   - Full URLs have their protocol + host stripped.
 *   - Query parameters are removed.
 *   - A trailing slash is always appended.
 *   - Multiple consecutive slashes are collapsed.
 *   - An empty or whitespace-only input returns null.
 */

export function normalizeLandingPage(
  originPage?: string | null,
  originUrl?: string | null,
  landingPage?: string | null,
): string | null {
  const candidates = [originPage, landingPage, originUrl];
  for (const c of candidates) {
    if (c != null && c.trim() !== '') {
      return normalizeToPath(c.trim());
    }
  }
  return null;
}

export function normalizeToPath(raw: string): string {
  let path: string;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      path = url.pathname;
    } catch {
      path = raw.replace(/^https?:\/\/[^/]*/i, '') || '/';
    }
  } else {
    path = raw;
  }

  if (!path.startsWith('/')) path = '/' + path;

  path = path.split('?')[0];

  path = path.replace(/\/+$/, '') + '/';

  path = path.replace(/\/\/+/g, '/');

  return path;
}
