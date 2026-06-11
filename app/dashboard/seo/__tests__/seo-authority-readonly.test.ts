import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  resolve(process.cwd(), 'app/api/proxy/seo/authority/route.ts'),
  'utf8',
);
const pageSource = readFileSync(
  resolve(process.cwd(), 'app/dashboard/seo/authority/page.tsx'),
  'utf8',
);

describe('SEO Authority surface', () => {
  it('reads only the PII-safe off-page authority queue view', () => {
    expect(routeSource).toContain('analytics.v_seo_offpage_authority_queue');
    expect(routeSource).not.toContain('seo_offpage_contact');
    expect(routeSource).not.toContain('seo_offpage_conversation');
  });

  it('has no write or outreach actions in this slice', () => {
    const combined = `${routeSource}\n${pageSource}`;
    expect(combined).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b/i);
    expect(combined).not.toContain('approveEngineCandidate');
    expect(combined).not.toContain('rejectEngineCandidate');
    expect(combined).not.toContain('Smartlead');
    expect(combined).not.toContain('send');
  });

  it('links opportunities to the page-performance dossier affordance', () => {
    expect(pageSource).toContain('Earn authority for this page');
    expect(pageSource).toContain('/dashboard/seo/performance?url=');
  });
});
