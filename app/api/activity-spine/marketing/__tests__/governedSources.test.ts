import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const MARKETING_API_DIR = join(process.cwd(), 'app/api/activity-spine/marketing');
const FORBIDDEN_SOURCE_RE = new RegExp(`raw_${'ahrefs'}_|raw_${'google_ads'}_`, 'g');

function listRouteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) return listRouteFiles(fullPath);
    return fullPath.endsWith('.ts') ? [fullPath] : [];
  });
}

describe('Marketing governed source guardrails', () => {
  it('does not read retired Ahrefs or raw Google Ads tables in live Marketing routes', () => {
    const offenders = listRouteFiles(MARKETING_API_DIR)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf8');
        const matches = source.match(FORBIDDEN_SOURCE_RE) ?? [];
        return matches.map((match) => `${relative(process.cwd(), file)}: ${match}`);
      });

    expect(offenders).toEqual([]);
  });

  it('keeps shared Marketing KPIs on governed SEO, paid, and health sources', () => {
    const marketingQueries = readFileSync(join(process.cwd(), 'services/marketingQueries.ts'), 'utf8');

    expect(marketingQueries).toContain('analytics.seo_command_center_gsc_window');
    expect(marketingQueries).toContain('analytics.metrics_google_ads_campaign_daily');
    expect(marketingQueries).toContain('marketing.google_ads_quote_performance');
    expect(marketingQueries).toContain('analytics.v_seo_system_health');
  });
});
