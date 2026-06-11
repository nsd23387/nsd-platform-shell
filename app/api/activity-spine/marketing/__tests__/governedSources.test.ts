import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
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

  it('keeps C2b cross-surface organic contracts replay-safe and on the metrics table', () => {
    const oldMigration = join(
      process.cwd(),
      'supabase/migrations/20260610000001_c2b_cross_surface_metric_contracts.sql',
    );
    const migrationPath = join(
      process.cwd(),
      'supabase/migrations/20260610230000_c2b_cross_surface_metric_contracts.sql',
    );
    const migration = readFileSync(migrationPath, 'utf8');
    const organicContracts = migration.slice(
      migration.indexOf("'cross_surface_organic_clicks_7d'"),
      migration.indexOf("'cross_surface_quotes_30d'"),
    );

    expect(existsSync(oldMigration)).toBe(false);
    expect(migration).toContain('-- Migration: 20260610230000_c2b_cross_surface_metric_contracts.sql');
    expect(organicContracts).toContain('FROM analytics.metrics_search_console_daily');
    expect(organicContracts).toContain('SELECT max(date)::date AS end_date');
    expect(organicContracts).toContain('sum(d.avg_position::numeric * d.impressions::numeric)');
    expect(organicContracts).not.toContain('seo_command_center_gsc_window');
  });
});
