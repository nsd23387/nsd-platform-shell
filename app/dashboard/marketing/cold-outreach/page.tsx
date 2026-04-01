'use client';

import React, { useContext } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { DashboardGrid } from '../../../../components/dashboard/DashboardGrid';
import { SkeletonCard } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import { MarketingContext } from '../lib/MarketingContext';
import { formatNumber, formatPercent, formatCurrency } from '../lib/format';
import type { ColdOutreachKPIs } from '../../../../types/activity-spine';

interface KPICardProps {
  label: string;
  value: string;
  testId: string;
}

function KPICard({ label, value, testId }: KPICardProps) {
  const tc = useThemeColors();
  return (
    <div
      style={{
        padding: space['4'],
        border: `1px solid ${tc.border.subtle}`,
        borderRadius: radius.lg,
        backgroundColor: tc.background.surface,
      }}
      data-testid={testId}
    >
      <p style={{
        fontFamily: fontFamily.body,
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.semibold,
        color: tc.text.primary,
      }}>
        {value}
      </p>
      <p style={{
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        color: tc.text.muted,
        marginTop: space['1'],
      }}>
        {label}
      </p>
    </div>
  );
}

function buildKPICards(kpis: ColdOutreachKPIs): { label: string; value: string; testId: string }[] {
  return [
    { label: 'Contacts Sourced', value: formatNumber(kpis.contacts_sourced), testId: 'cold-kpi-contacts' },
    { label: 'Emails Sent', value: formatNumber(kpis.emails_sent), testId: 'cold-kpi-emails-sent' },
    { label: 'Deliverability Rate', value: formatPercent(kpis.deliverability_rate), testId: 'cold-kpi-deliverability' },
    { label: 'Reply Rate', value: formatPercent(kpis.reply_rate), testId: 'cold-kpi-reply-rate' },
    { label: 'Positive Reply Rate', value: formatPercent(kpis.positive_reply_rate), testId: 'cold-kpi-positive-reply' },
    { label: 'Pipeline Created', value: formatCurrency(kpis.pipeline_value_usd), testId: 'cold-kpi-pipeline' },
  ];
}

export default function ColdOutreachPage() {
  const tc = useThemeColors();
  const { data, loading } = useContext(MarketingContext);

  const kpis = data?.cold_outreach_kpis;
  const hasData = kpis && (
    kpis.contacts_sourced > 0 || kpis.emails_sent > 0 || kpis.pipeline_value_usd > 0
  );

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Core 4 Engines'}, {label:'Cold Outreach'}]} />
        <div style={{ marginBottom: space['6'] }}>
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
            Cold Outreach
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            Email sequences, reply rates, and pipeline from outbound campaigns.
          </p>
        </div>

        {loading ? (
          <DashboardSection title="Outreach Performance" description="Campaign metrics from Sales Engine." index={0}>
            <DashboardGrid columns={{ sm: 2, md: 3, lg: 3 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} height={80} />)}
            </DashboardGrid>
          </DashboardSection>
        ) : hasData ? (
          <DashboardSection title="Outreach Performance" description="Campaign metrics from Sales Engine and pipeline attribution." index={0}>
            <DashboardGrid columns={{ sm: 2, md: 3, lg: 3 }}>
              {buildKPICards(kpis).map((card) => (
                <KPICard key={card.testId} {...card} />
              ))}
            </DashboardGrid>
          </DashboardSection>
        ) : (
          <DashboardSection title="No Data Yet" description="Cold outreach metrics will appear once the Sales Engine integration is active and campaigns have been run." index={0}>
            <div
              style={{
                padding: space['6'],
                border: `1px dashed ${tc.border.default}`,
                borderRadius: radius.lg,
                backgroundColor: tc.background.muted,
                textAlign: 'center' as const,
              }}
            >
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted, marginBottom: space['2'] }}>
                No cold outreach data available for the selected period.
              </p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.placeholder }}>
                Ensure SALES_ENGINE_URL is configured and campaigns have been executed.
              </p>
            </div>
          </DashboardSection>
        )}
      </div>
    </DashboardGuard>
  );
}
