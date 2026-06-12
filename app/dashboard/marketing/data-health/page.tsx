'use client';

import React, { useContext, useMemo } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import { MarketingPipelineHealthPanel } from '../components/MarketingPipelineHealthPanel';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import type { ExportSection } from '../../../../lib/exportUtils';

export default function DataHealthPage() {
  const tc = useThemeColors();
  const { data, loading, error } = useContext(MarketingContext);

  const exportSections = useMemo<ExportSection[]>(() => {
    if (!data) return [];
    const sections: ExportSection[] = [];

    if (data.pipeline_health?.length) {
      // D-20: these are integrity-check rows (source = check title, last_success
      // = last check run, status bucket) — label the export accordingly.
      sections.push({
        type: 'table',
        title: 'Engine Integrity Checks',
        columns: [
          { key: 'source', label: 'Check' },
          { key: 'last_success', label: 'Last Check Run' },
          { key: 'status', label: 'Status' },
        ],
        rows: data.pipeline_health.map(r => ({ ...r })),
      });
    }

    return sections;
  }, [data]);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'System'}, {label:'Data Health'}]} />
        <div style={{ marginBottom: space['6'], display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space['4'], flexWrap: 'wrap' }}>
          <div>
            <h1
              style={{
                fontFamily: fontFamily.display,
                fontSize: fontSize['3xl'],
                fontWeight: fontWeight.semibold,
                color: tc.text.primary,
                marginBottom: space['1'],
                lineHeight: lineHeight.snug,
              }}
              data-testid="text-page-title"
            >
              Attribution & Data Health
            </h1>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
              Business-rule integrity checks on the SEO/marketing data loop, plus the genuine source-freshness checks.
            </p>
          </div>
          <PageExportBar
            filename="data-health"
            pdfTitle="Attribution & Data Health"
            sections={exportSections}
            loading={loading}
          />
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        {/* D-20: these rows are business-rule integrity checks from
            analytics.v_seo_system_health, not ingestion telemetry — the panel
            renders its own "Engine Integrity Checks" section (no double wrap). */}
        <MarketingPipelineHealthPanel
          health={data?.pipeline_health ?? []}
          loading={loading}
          error={error}
        />
      </div>
    </DashboardGuard>
  );
}
