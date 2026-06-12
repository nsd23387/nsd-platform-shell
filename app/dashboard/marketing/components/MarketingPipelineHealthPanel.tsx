'use client';

// =============================================================================
// Engine Integrity Checks (D-20 reframe — read-only).
// The overview API's `pipeline_health` rows are NOT ingestion telemetry: the
// query (services/marketingQueries.ts T008) reads analytics.v_seo_system_health
// — business-rule integrity checks on the SEO/marketing data loop — and the old
// rendering disguised them as "Ingestion status … Stale … Failure Rate (24h)
// 100.0%" (the "failure rate" is actually a 0/1 is-failing flag in that SQL).
//
// This panel now renders them as what they are. It fetches the FULL check rows
// (plain-language what-it-means + fix line + self-heal log) from the same view
// via /api/proxy/seo/system-health and reuses the SEO Command Center's
// SystemHealthPanel extraction. Genuinely-ingestion freshness rows (catalog
// category 'data') are grouped separately from the business-rule checks. If
// that fetch fails, we fall back to the overview rows the panel receives as
// props — rendered honestly (failing/passing, "last check run") instead of as
// fake ingestion percentages.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MarketingPipelineHealth } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { DashboardGrid } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSeoSystemHealth } from '../../../../lib/seoApi';
import type { SeoSystemHealthRow } from '../../../../lib/seoApi';
import { SystemHealthPanel } from '../../seo/components/SystemHealthPanel';

interface Props {
  health: MarketingPipelineHealth[];
  loading: boolean;
  error: string | null;
}

const SECTION_TITLE = 'Engine Integrity Checks';
const SECTION_CAPTION =
  'Business-rule checks on the SEO/marketing data loop — red means the rule is failing now, not that ingestion is down.';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff) || diff < 0) return 'unknown';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Honest fallback card for one overview-API row. The row only carries
// source(=check title), run time, a 0/1 failing flag, and a status bucket —
// the what-it-means / fix text lives on the SEO system-health endpoint.
function FallbackCheckRow({ h }: { h: MarketingPipelineHealth }) {
  const tc = useThemeColors();
  const failing = h.status === 'stale' || h.failure_rate_24h >= 1;
  const warning = !failing && h.status === 'warning';
  const sem = failing ? tc.semantic.danger : warning ? tc.semantic.warning : tc.semantic.success;
  const label = failing ? 'failing now' : warning ? 'warning' : 'passing';

  return (
    <div
      style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.xl,
        padding: space['5'],
      }}
      data-testid={`health-source-${h.source}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space['3'], flexWrap: 'wrap' }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.primary, minWidth: 0 }}>
          {h.source}
        </span>
        <span style={{
          fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
          color: sem.dark, backgroundColor: sem.light,
          padding: `${space['0.5']} ${space['2.5']}`, borderRadius: radius.full,
        }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: space['3'] }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Last check run</span>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.secondary }}>{timeAgo(h.last_success)}</span>
      </div>
      <div style={{ marginTop: space['3'], fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, lineHeight: 1.5 }}>
        {failing
          ? 'This business rule is failing right now — it does not mean a data pipeline is down.'
          : 'This business rule is currently satisfied.'}{' '}
        <strong style={{ fontWeight: fontWeight.medium, color: tc.text.secondary }}>Fix:</strong>{' '}
        open SEO Command Center → System Health for what this check means and the remediation steps.
      </div>
    </div>
  );
}

export function MarketingPipelineHealthPanel({ health, loading, error }: Props) {
  const tc = useThemeColors();
  const router = useRouter();
  const [fullRows, setFullRows] = useState<SeoSystemHealthRow[] | null>(null);
  const [fullRowsFailed, setFullRowsFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getSeoSystemHealth()
      .then((rows) => { if (alive) setFullRows(rows); })
      .catch(() => { if (alive) setFullRowsFailed(true); });
    return () => { alive = false; };
  }, []);

  if (loading && !fullRows) {
    return (
      <DashboardSection title={SECTION_TITLE} description={SECTION_CAPTION}>
        <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
          <SkeletonCard height={120} lines={2} />
          <SkeletonCard height={120} lines={2} />
        </DashboardGrid>
      </DashboardSection>
    );
  }

  // Preferred path: full catalog rows (status + what-it-means + fix + self-heal)
  // from the shared view, rendered with the Command Center's panel. Catalog
  // category 'data' = the genuinely freshness/ingestion-style checks; they get
  // their own group so rule failures are never read as "ingestion is down".
  if (fullRows && fullRows.length > 0) {
    const freshnessRows = fullRows.filter((r) => r.category === 'data');
    const ruleRows = fullRows.filter((r) => r.category !== 'data');
    const openDossier = (url: string) => router.push(`/dashboard/seo?url=${encodeURIComponent(url)}`);
    return (
      <DashboardSection title={SECTION_TITLE} description={SECTION_CAPTION}>
        <SystemHealthPanel
          tc={tc}
          rows={ruleRows}
          error={null}
          onOpenDossier={openDossier}
          title="Business-rule checks"
          description="Red = the rule is failing right now. Each row says what it means and how to fix it; sample links open the page dossier on the SEO Command Center."
        />
        {freshnessRows.length > 0 && (
          <SystemHealthPanel
            tc={tc}
            rows={freshnessRows}
            error={null}
            onOpenDossier={openDossier}
            title="Data freshness & ingestion checks"
            description="The rows that genuinely track source data freshness — the only ones where red can mean stale ingestion."
          />
        )}
      </DashboardSection>
    );
  }

  // Fallback path: the overview API's slimmed rows (same view, fewer columns).
  if (error && health.length === 0) return null;

  if (health.length === 0) {
    return (
      <DashboardSection title={SECTION_TITLE} description={SECTION_CAPTION}>
        <EmptyStateCard message="No integrity check results returned — check that the integrity job has run (analytics.v_seo_system_health is empty)." />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title={SECTION_TITLE} description={SECTION_CAPTION}>
      {fullRowsFailed && (
        <div style={{ marginBottom: space['3'], fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
          Full check details (what-it-means / fix) are unavailable right now — showing the summary rows from the overview API.
        </div>
      )}
      <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }} data-testid="card-pipeline-health">
        {health.map((h) => <FallbackCheckRow key={h.source} h={h} />)}
      </DashboardGrid>
    </DashboardSection>
  );
}
