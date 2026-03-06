'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { DashboardGrid } from '../../../../components/dashboard/DashboardGrid';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { Icon } from '../../../../design/components/Icon';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';

function ConnectCard({ title, description, integration }: { title: string; description: string; integration: string }) {
  const tc = useThemeColors();
  return (
    <div
      style={{
        padding: space['6'],
        border: `1px dashed ${tc.border.default}`,
        borderRadius: radius.lg,
        backgroundColor: tc.background.muted,
        textAlign: 'center' as const,
      }}
      data-testid={`card-connect-${integration}`}
    >
      <div style={{ marginBottom: space['3'] }}>
        <Icon name="send" size={24} color={tc.text.placeholder} />
      </div>
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>
        {title}
      </p>
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['4'] }}>
        {description}
      </p>
      <span
        style={{
          display: 'inline-block',
          padding: `${space['1.5']} ${space['4']}`,
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: tc.text.placeholder,
          border: `1px solid ${tc.border.default}`,
          borderRadius: radius.full,
        }}
      >
        Connect {integration}
      </span>
    </div>
  );
}

const KPIS = [
  'Contacts Sourced', 'Emails Sent', 'Deliverability Rate', 'Reply Rate',
  'Positive Reply Rate', 'Meetings Booked', 'Pipeline Created', 'CAC Equivalent',
];

export default function ColdOutreachPage() {
  const tc = useThemeColors();

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
            Email sequences, reply rates, and meeting pipeline from outbound campaigns.
          </p>
        </div>

        <DashboardSection title="Integration Required" description="Connect a sales engagement platform to populate this dashboard.">
          <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
            <ConnectCard
              title="Sales Engine Integration"
              description="Connect your NSD Sales Engine to track outbound campaign performance, email deliverability, and pipeline attribution."
              integration="Sales Engine"
            />
            <ConnectCard
              title="Apollo Integration"
              description="Connect Apollo.io to import sequence data, contact engagement metrics, and meeting bookings."
              integration="Apollo"
            />
          </DashboardGrid>
        </DashboardSection>

        <DashboardSection title="KPIs Available After Integration" description="These metrics will populate once a data source is connected.">
          <DashboardGrid columns={{ sm: 2, md: 4, lg: 4 }}>
            {KPIS.map((kpi) => (
              <div
                key={kpi}
                style={{
                  padding: space['4'],
                  border: `1px solid ${tc.border.subtle}`,
                  borderRadius: radius.lg,
                  backgroundColor: tc.background.surface,
                }}
              >
                <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.disabled }}>—</p>
                <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, marginTop: space['1'] }}>{kpi}</p>
              </div>
            ))}
          </DashboardGrid>
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
