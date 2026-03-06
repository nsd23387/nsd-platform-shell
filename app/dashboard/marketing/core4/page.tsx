'use client';

import React, { useContext, useMemo } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';

function fmt(n: number | undefined, prefix = '') {
  if (n === undefined || !isFinite(n) || isNaN(n)) return '—';
  return prefix + n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function fmtCurrency(n: number | undefined) {
  if (n === undefined || !isFinite(n) || isNaN(n)) return '—';
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtPct(n: number | undefined) {
  if (n === undefined || !isFinite(n) || isNaN(n)) return '—';
  return n.toFixed(1) + '%';
}

const COLUMNS = ['Engine', 'Sessions', 'Clicks', 'Quotes', 'Quote Rate', 'Pipeline', 'Spend', 'CAC/CPA', 'ROAS/MER'];

interface EngineRow {
  name: string;
  href: string;
  sessions: string;
  clicks: string;
  quotes: string;
  quoteRate: string;
  pipeline: string;
  spend: string;
  cac: string;
  roas: string;
}

export default function Core4OverviewPage() {
  const tc = useThemeColors();
  const { data, loading } = useContext(MarketingContext);

  const engines: EngineRow[] = useMemo(() => {
    const core4 = data?.core4_summary;
    if (!core4) {
      return [
        { name: 'Warm Outreach', href: '/dashboard/marketing/warm-outreach', sessions: '—', clicks: '—', quotes: '—', quoteRate: '—', pipeline: '—', spend: '$0', cac: '—', roas: '—' },
        { name: 'Cold Outreach', href: '/dashboard/marketing/cold-outreach', sessions: '—', clicks: '—', quotes: '—', quoteRate: '—', pipeline: '—', spend: '$0', cac: '—', roas: '—' },
        { name: 'SEO', href: '/dashboard/marketing/content', sessions: '—', clicks: '—', quotes: '—', quoteRate: '—', pipeline: '—', spend: '$0', cac: '—', roas: '—' },
        { name: 'Run Paid Ads', href: '/dashboard/marketing/paid-ads', sessions: '—', clicks: '—', quotes: '—', quoteRate: '—', pipeline: '—', spend: '—', cac: '—', roas: '—' },
      ];
    }

    const map: { key: keyof typeof core4; name: string; href: string }[] = [
      { key: 'warm_outreach', name: 'Warm Outreach', href: '/dashboard/marketing/warm-outreach' },
      { key: 'cold_outreach', name: 'Cold Outreach', href: '/dashboard/marketing/cold-outreach' },
      { key: 'post_free_content', name: 'SEO', href: '/dashboard/marketing/content' },
      { key: 'run_paid_ads', name: 'Run Paid Ads', href: '/dashboard/marketing/paid-ads' },
    ];

    return map.map(({ key, name, href }) => {
      const c = core4[key]?.current;
      return {
        name,
        href,
        sessions: fmt(c?.sessions),
        clicks: fmt(c?.clicks),
        quotes: fmt(c?.quotes),
        quoteRate: fmtPct(c?.quote_rate),
        pipeline: fmtCurrency(c?.pipeline_value_usd),
        spend: fmtCurrency(c?.spend),
        cac: fmtCurrency(c?.cac),
        roas: fmt(c?.roas),
      };
    });
  }, [data]);

  const thStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: 'left' as const,
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
    borderBottom: `1px solid ${tc.border.subtle}`,
    whiteSpace: 'nowrap' as const,
  };

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Overview'}, {label:'Core 4 Comparison'}]} />
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
            Core 4 Overview
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            Compare all four growth engines side-by-side, ranked by ROI.
          </p>
        </div>

        <DashboardSection title="Engine Comparison" description="Click a row to drill into that engine.">
          <div
            style={{
              overflow: 'auto',
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.lg,
              backgroundColor: tc.background.surface,
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 200ms',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-core4-engines">
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {engines.map((engine) => (
                  <tr
                    key={engine.name}
                    onClick={() => { window.location.href = engine.href; }}
                    style={{ cursor: 'pointer' }}
                    data-testid={`row-engine-${engine.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{engine.name}</td>
                    <td style={tdStyle}>{engine.sessions}</td>
                    <td style={tdStyle}>{engine.clicks}</td>
                    <td style={tdStyle}>{engine.quotes}</td>
                    <td style={tdStyle}>{engine.quoteRate}</td>
                    <td style={tdStyle}>{engine.pipeline}</td>
                    <td style={tdStyle}>{engine.spend}</td>
                    <td style={tdStyle}>{engine.cac}</td>
                    <td style={tdStyle}>{engine.roas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
