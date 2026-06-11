'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import type { ExportSection } from '../../../../lib/exportUtils';

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

const NA = '—';
// D-17: cells with no governed source render an em dash, never a fabricated zero.
const NA_TOOLTIP = 'No governed source wired for this metric';

interface EngineRow {
  name: string;
  href: string;
  subLabel?: string;
  sessions: string;
  clicks: string;
  quotes: string;
  quoteRate: string;
  pipeline: string;
  spend: string;
  cac: string;
  roas: string;
}

interface ColdOutreachSummary {
  emailsSent: number;
  replyRate: number;
  leadsPushed: number;
}

const EMPTY_ROWS: EngineRow[] = [
  { name: 'Warm Outreach', href: '/dashboard/marketing/warm-outreach', sessions: NA, clicks: NA, quotes: NA, quoteRate: NA, pipeline: NA, spend: NA, cac: NA, roas: NA },
  { name: 'Cold Outreach', href: '/dashboard/marketing/cold-outreach', sessions: NA, clicks: NA, quotes: NA, quoteRate: NA, pipeline: NA, spend: NA, cac: NA, roas: NA },
  { name: 'SEO Summary', href: '/dashboard/marketing/seo', sessions: NA, clicks: NA, quotes: NA, quoteRate: NA, pipeline: NA, spend: NA, cac: NA, roas: NA },
  { name: 'Paid Summary', href: '/dashboard/marketing/paid-ads', sessions: NA, clicks: NA, quotes: NA, quoteRate: NA, pipeline: NA, spend: NA, cac: NA, roas: NA },
];

export default function Core4OverviewPage() {
  const tc = useThemeColors();
  const { data, loading } = useContext(MarketingContext);

  // D-17: the overview API has no cold-outreach source (it returned hardcoded
  // zeros). Pull the same Sales Engine summary the Cold Outreach page uses.
  const [coldSummary, setColdSummary] = useState<ColdOutreachSummary | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/proxy/cold-outreach-summary?window=30d', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d._source === 'live') {
          setColdSummary({ emailsSent: d.emailsSent ?? 0, replyRate: d.replyRate ?? 0, leadsPushed: d.leadsPushed ?? 0 });
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const engines: EngineRow[] = useMemo(() => {
    const core4 = data?.core4_summary;

    const coldSubLabel = coldSummary
      ? `Sales Engine · last 30d: ${coldSummary.emailsSent.toLocaleString()} emails sent · ${(coldSummary.replyRate * 100).toFixed(1)}% reply · ${coldSummary.leadsPushed.toLocaleString()} leads pushed`
      : 'No governed session/quote source wired — engine metrics live on the Cold Outreach page';

    if (!core4) {
      return EMPTY_ROWS.map((row) => (row.name === 'Cold Outreach' ? { ...row, subLabel: coldSubLabel } : row));
    }

    const map: { key: keyof typeof core4; name: string; href: string }[] = [
      { key: 'warm_outreach', name: 'Warm Outreach', href: '/dashboard/marketing/warm-outreach' },
      { key: 'post_free_content', name: 'SEO Summary', href: '/dashboard/marketing/seo' },
      { key: 'run_paid_ads', name: 'Paid Summary', href: '/dashboard/marketing/paid-ads' },
    ];

    const rows = map.map(({ key, name, href }) => {
      const c = core4[key]?.current;
      const hasSpend = (c?.spend ?? 0) > 0;
      return {
        name,
        href,
        sessions: fmt(c?.sessions),
        clicks: fmt(c?.clicks),
        quotes: fmt(c?.quotes),
        quoteRate: c != null ? fmtPct(c.quote_rate * 100) : NA,
        pipeline: fmtCurrency(c?.pipeline_value_usd),
        spend: fmtCurrency(c?.spend),
        // D-17: CAC/ROAS only exist where spend exists. $0-spend engines get an
        // em dash, not a fabricated 0.
        cac: hasSpend && c ? fmtCurrency(c.cac) : NA,
        roas: hasSpend && c ? `${fmt(c.roas)}x` : NA,
      };
    });

    // Cold outreach: the overview API has no governed source for this engine
    // (sessions/quotes/pipeline were hardcoded zeros) — render em dashes plus
    // the live Sales Engine summary as a sub-label.
    const coldRow: EngineRow = {
      name: 'Cold Outreach',
      href: '/dashboard/marketing/cold-outreach',
      subLabel: coldSubLabel,
      sessions: NA, clicks: NA, quotes: NA, quoteRate: NA, pipeline: NA, spend: NA, cac: NA, roas: NA,
    };

    return [rows[0], coldRow, rows[1], rows[2]];
  }, [data, coldSummary]);

  const exportSections: ExportSection[] = useMemo(() => {
    return [
      {
        type: 'table' as const,
        title: 'Core 4 Engine Comparison',
        columns: [
          { key: 'name', label: 'Engine' },
          { key: 'sessions', label: 'Sessions' },
          { key: 'clicks', label: 'Clicks' },
          { key: 'quotes', label: 'Quotes' },
          { key: 'quoteRate', label: 'Quote Rate' },
          { key: 'pipeline', label: 'Pipeline' },
          { key: 'spend', label: 'Spend' },
          { key: 'cac', label: 'CAC/CPA' },
          { key: 'roas', label: 'ROAS/MER' },
        ],
        rows: engines.map(({ href, ...rest }) => rest),
      },
    ];
  }, [engines]);

  const thStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: 'left' as const,
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
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
            Compare all four growth engines side-by-side.
          </p>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.placeholder, marginTop: space['1'] }}>
            Quotes/pipeline: QMS quote spine · submitted value · selected window. Sessions: GA4. Spend: Google Ads. &ldquo;{NA}&rdquo; = no governed source wired.
          </p>
          <div style={{ marginTop: space['3'] }}>
            <PageExportBar
              filename="core4-comparison"
              pdfTitle="Core 4 Engine Comparison"
              sections={exportSections}
              loading={loading}
            />
          </div>
        </div>

        <DashboardSection title="Engine Comparison" description="Click a row to drill into that engine." index={0}>
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
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary, whiteSpace: 'normal' }}>
                      {engine.name}
                      {engine.subLabel && (
                        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.normal, color: tc.text.muted, marginTop: space['0.5'], maxWidth: 320 }}>
                          {engine.subLabel}
                        </div>
                      )}
                    </td>
                    {([engine.sessions, engine.clicks, engine.quotes, engine.quoteRate, engine.pipeline, engine.spend, engine.cac, engine.roas]).map((value, i) => (
                      <td key={COLUMNS[i + 1]} style={tdStyle} title={value === NA ? NA_TOOLTIP : undefined}>
                        {value}
                      </td>
                    ))}
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
