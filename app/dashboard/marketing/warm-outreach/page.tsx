'use client';

import React, { useContext, useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { DashboardGrid } from '../../../../components/dashboard/DashboardGrid';
import { DashboardCard } from '../../../../components/dashboard/DashboardCard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import { StatTile } from '../components/adminto/StatTile';
import { AreaLineChart } from '../../../../components/dashboard/charts/AreaLineChart';
import { magenta, indigo, violet } from '../../../../design/tokens/colors';
import { getTargetForMetric } from '../lib/marketingTargets';
import type {
  QMSAnalytics,
  QMSRecentDeal,
  QMSStatusBreakdown,
  QMSAttribution,
} from '../../../../types/activity-spine';

function formatUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cents);
}

function formatDate(iso: string | null): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(iso: string | null): string {
  if (!iso) return '\u2014';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  'Quote Submitted': indigo[500],
  'Awaiting Response': indigo[600],
  'Quote Approved': violet[500],
  'Awaiting Deposit': violet[600],
  'Deposit Paid': magenta[500],
  'Mockups In Review': magenta[600],
  'Revisions Requested': indigo[400],
  'Revisions Adjusted': indigo[500],
  'Design Approved': violet[500],
  'Quote Paid': magenta[700],
  'Not Interested': indigo[800],
  'Pending Management Review': violet[400],
  'Admin Review Changes Requested': violet[600],
};

function useQMSData(): { data: QMSAnalytics | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<QMSAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchQMS() {
      try {
        const res = await fetch('/api/activity-spine/marketing/qms');
        if (!res.ok) throw new Error(`QMS fetch failed: ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json.data ?? null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }
    fetchQMS();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

function AgingBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const tc = useThemeColors();
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: space['2'] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: space['1'] }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{label}</span>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>{count}</span>
      </div>
      <div style={{ height: 6, backgroundColor: tc.background.muted, borderRadius: radius.full, overflow: 'hidden' }}>
        <div
          style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: radius.full, transition: 'width 0.3s' }}
          data-testid={`bar-aging-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
    </div>
  );
}

function StatusBreakdownRow({ item, maxCount }: { item: QMSStatusBreakdown; maxCount: number }) {
  const tc = useThemeColors();
  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
  const color = STATUS_COLORS[item.status] ?? indigo[500];
  return (
    <div style={{ marginBottom: space['3'] }} data-testid={`status-row-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space['1'] }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{item.status}</span>
        <div style={{ display: 'flex', gap: space['3'], alignItems: 'baseline' }}>
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>{item.count}</span>
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted }}>{formatUSD(item.value_usd)}</span>
        </div>
      </div>
      <div style={{ height: 4, backgroundColor: tc.background.muted, borderRadius: radius.full, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: radius.full, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function DealRow({ deal }: { deal: QMSRecentDeal }) {
  const tc = useThemeColors();
  const color = STATUS_COLORS[deal.status] ?? indigo[500];
  return (
    <tr data-testid={`deal-row-${deal.quote_number}`}>
      <td style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>
        {deal.quote_number}
      </td>
      <td style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>
        {deal.customer_name ?? '\u2014'}
      </td>
      <td style={{ padding: `${space['2']} ${space['3']}` }}>
        <span style={{
          fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium,
          padding: `${space['0.5']} ${space['2']}`, borderRadius: radius.DEFAULT,
          backgroundColor: `${color}18`, color: color,
        }}>
          {deal.status}
        </span>
      </td>
      <td style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary, textAlign: 'right' }}>
        {formatUSD(deal.total_price_usd)}
      </td>
      <td style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
        {deal.sign_type ?? '\u2014'}
      </td>
      <td style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
        {timeAgo(deal.updated_at)}
      </td>
    </tr>
  );
}

function AttributionRow({ item }: { item: QMSAttribution }) {
  const tc = useThemeColors();
  return (
    <tr data-testid={`attr-row-${item.source}`}>
      <td style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }}>{item.source}</td>
      <td style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary, textAlign: 'right' }}>{item.count}</td>
      <td style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, textAlign: 'right' }}>{formatUSD(item.value_usd)}</td>
      <td style={{ padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, textAlign: 'right' }}>{item.won}</td>
    </tr>
  );
}

function EmptyDataCard({ title, description }: { title: string; description: string }) {
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
    >
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>
        {title}
      </p>
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
        {description}
      </p>
    </div>
  );
}

export default function WarmOutreachPage() {
  const tc = useThemeColors();
  const { data, loading, error } = useContext(MarketingContext);
  const qms = useQMSData();

  const conversions = data?.recent_conversions ?? [];
  const pipeline = data?.pipeline_categories ?? [];

  const qmsAvailable = qms.data?.available === true;
  const qmsPipeline = qms.data?.pipeline;
  const qmsAging = qms.data?.aging;
  const qmsCloseRate = qms.data?.close_rate;
  const qmsVelocity = qms.data?.velocity;
  const qmsStatusBreakdown = qms.data?.status_breakdown ?? [];
  const qmsRecentDeals = qms.data?.recent_deals ?? [];
  const qmsAttribution = qms.data?.attribution ?? [];
  const qmsDiscount = qms.data?.discount_usage;

  const agingTotal = qmsAging
    ? qmsAging.bucket_0_2d + qmsAging.bucket_3_7d + qmsAging.bucket_8_14d + qmsAging.bucket_15_plus
    : 0;
  const maxStatusCount = qmsStatusBreakdown.reduce((m, s) => Math.max(m, s.count), 0);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Core 4 Engines'}, {label:'Warm Outreach'}]} />
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
            Warm Outreach
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            Quote follow-ups, close rates, and returning visitor revenue.
          </p>
        </div>

        {qmsAvailable && qms.data?.timeseries && (
          <DashboardSection title="Pipeline Trend (90d)" description="Daily pipeline value from new quotes created.">
            {(() => {
              const ts = qms.data.timeseries.pipeline ?? [];
              if (!ts.length) return null;
              const chartData = ts.map((s) => ({ date: s.date, pipeline: s.value }));
              return (
                <AreaLineChart
                  data={chartData}
                  series={[{ dataKey: 'pipeline', label: 'Pipeline ($)', color: magenta[500] }]}
                  height={220}
                  formatXAxis={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
              );
            })()}
          </DashboardSection>
        )}

        {qmsAvailable && qms.data?.timeseries && (
          <DashboardSection title="Quotes Trend (90d)" description="Daily new quotes created.">
            {(() => {
              const ts = qms.data.timeseries.quotes ?? [];
              if (!ts.length) return null;
              const chartData = ts.map((s) => ({ date: s.date, quotes: s.value }));
              return (
                <AreaLineChart
                  data={chartData}
                  series={[{ dataKey: 'quotes', label: 'Quotes', color: indigo[600] }]}
                  height={220}
                  formatXAxis={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
              );
            })()}
          </DashboardSection>
        )}

        {qmsAvailable && qms.data?.timeseries && (
          <DashboardSection title="Won Revenue Trend (90d)" description="Daily revenue from closed-won deals.">
            {(() => {
              const ts = qms.data.timeseries.won_revenue ?? [];
              if (!ts.length) return null;
              const chartData = ts.map((s) => ({ date: s.date, won: s.value }));
              return (
                <AreaLineChart
                  data={chartData}
                  series={[{ dataKey: 'won', label: 'Won Revenue ($)', color: violet[500] }]}
                  height={220}
                  formatXAxis={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
              );
            })()}
          </DashboardSection>
        )}

        <DashboardSection title="Submissions Trend" description="Daily form submissions and conversion events.">
          {(() => {
            const submissions = data?.timeseries?.submissions ?? [];
            if (!submissions.length && !loading) return null;
            const chartData = submissions.map((s) => ({ date: s.date, submissions: s.value }));
            const target = getTargetForMetric('submissions', chartData.length || 30);
            return (
              <AreaLineChart
                data={chartData}
                series={[{ dataKey: 'submissions', label: 'Submissions', color: magenta[500] }]}
                height={220}
                targetValue={target?.daily}
                targetLabel={target?.label}
                formatXAxis={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
            );
          })()}
        </DashboardSection>

        {qms.loading && (
          <DashboardSection title="QMS Pipeline" description="Loading quote management data...">
            <DashboardGrid columns={{ sm: 2, md: 3, lg: 4 }}>
              <StatTile label="Active Pipeline" value="..." loading />
              <StatTile label="Won Revenue" value="..." loading />
              <StatTile label="Close Rate" value="..." loading />
              <StatTile label="Avg Days to Close" value="..." loading />
            </DashboardGrid>
          </DashboardSection>
        )}

        {qmsAvailable && qmsPipeline && (
          <>
            <DashboardSection title="QMS Pipeline" description="Live deal metrics from the Quote Management System.">
              <DashboardGrid columns={{ sm: 2, md: 3, lg: 4 }}>
                <StatTile
                  label="Active Pipeline"
                  value={formatUSD(qmsPipeline.pipeline_value_usd)}
                />
                <StatTile
                  label="Active Deals"
                  value={qmsPipeline.active_deals}
                />
                <StatTile
                  label="Won Revenue"
                  value={formatUSD(qmsPipeline.won_revenue_usd)}
                />
                <StatTile
                  label="Avg Deal Size"
                  value={formatUSD(qmsPipeline.avg_deal_value_usd)}
                />
              </DashboardGrid>
            </DashboardSection>

            <DashboardSection title="Deal Health" description="Close rate, velocity, and aging distribution.">
              <DashboardGrid columns={{ sm: 1, md: 2, lg: 3 }}>
                <DashboardCard title="Quote-to-Close Rate (90d)" loading={qms.loading}>
                  {qmsCloseRate && (
                    <div data-testid="card-close-rate">
                      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['2'] }}>
                        {(qmsCloseRate.rate * 100).toFixed(1)}%
                      </p>
                      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, marginBottom: space['3'] }}>
                        {qmsCloseRate.won} won out of {qmsCloseRate.total} total quotes
                      </p>
                      <div style={{ display: 'flex', gap: space['4'], marginBottom: space['2'] }}>
                        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                          Won: {qmsCloseRate.won}
                        </span>
                        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                          Lost: {qmsCloseRate.lost}
                        </span>
                        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                          Open: {qmsCloseRate.open}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: space['4'], marginBottom: space['2'] }}>
                        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted }}>
                          Won: {formatUSD(qmsCloseRate.won_revenue_usd)}
                        </span>
                        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted }}>
                          Lost: {formatUSD(qmsCloseRate.lost_revenue_usd)}
                        </span>
                      </div>
                      {qmsCloseRate.decision_rate > 0 && (
                        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, marginTop: space['2'] }}>
                          Decision win rate: {(qmsCloseRate.decision_rate * 100).toFixed(0)}% ({qmsCloseRate.won} of {qmsCloseRate.won + qmsCloseRate.lost} decided)
                        </p>
                      )}
                    </div>
                  )}
                </DashboardCard>

                <DashboardCard title="Deal Velocity (90d)" loading={qms.loading}>
                  {qmsVelocity && (
                    <div data-testid="card-velocity">
                      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'] }}>
                        {qmsVelocity.avg_days_to_close}d
                      </p>
                      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>
                        avg days to close
                      </p>
                      {qmsVelocity.avg_days_to_deposit > 0 && (
                        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                          {qmsVelocity.avg_days_to_deposit}d avg to deposit
                        </p>
                      )}
                      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, marginTop: space['2'] }}>
                        Based on {qmsVelocity.sample_size} closed deals
                      </p>
                    </div>
                  )}
                </DashboardCard>

                <DashboardCard title="Quote Aging" loading={qms.loading}>
                  {qmsAging && (
                    <div data-testid="card-aging">
                      <AgingBar label="0-2 days" count={qmsAging.bucket_0_2d} total={agingTotal} color={magenta[500]} />
                      <AgingBar label="3-7 days" count={qmsAging.bucket_3_7d} total={agingTotal} color={violet[500]} />
                      <AgingBar label="8-14 days" count={qmsAging.bucket_8_14d} total={agingTotal} color={indigo[600]} />
                      <AgingBar label="15+ days" count={qmsAging.bucket_15_plus} total={agingTotal} color={indigo[800]} />
                    </div>
                  )}
                </DashboardCard>
              </DashboardGrid>
            </DashboardSection>

            {qmsStatusBreakdown.length > 0 && (
              <DashboardSection title="Status Breakdown" description="Active deals by quote lifecycle stage.">
                <DashboardGrid columns={{ sm: 1, md: 2 }}>
                  <DashboardCard title="By Stage" loading={qms.loading}>
                    <div data-testid="card-status-breakdown">
                      {qmsStatusBreakdown.map((item) => (
                        <StatusBreakdownRow key={item.status} item={item} maxCount={maxStatusCount} />
                      ))}
                    </div>
                  </DashboardCard>

                  {qmsDiscount && (
                    <DashboardCard title="Discount Usage (90d)" loading={qms.loading}>
                      <div data-testid="card-discount-usage">
                        <div style={{ display: 'flex', gap: space['4'], marginBottom: space['3'] }}>
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                              {qmsDiscount.with_discount}
                            </p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted }}>with discount</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                              {qmsDiscount.discount_redeemed}
                            </p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted }}>redeemed</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                              {qmsDiscount.total > 0 ? ((qmsDiscount.with_discount / qmsDiscount.total) * 100).toFixed(0) : 0}%
                            </p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted }}>offer rate</p>
                          </div>
                        </div>
                        {qmsDiscount.avg_discount_pct > 0 && (
                          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                            Avg discount: {qmsDiscount.avg_discount_pct}%
                          </p>
                        )}
                      </div>
                    </DashboardCard>
                  )}

                  {qms.data?.click_to_quote && (
                    <DashboardCard title="Click-to-Quote Rate (90d)" loading={qms.loading}>
                      <div data-testid="card-click-to-quote">
                        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['2'] }}>
                          {(qms.data.click_to_quote.blended_rate * 100).toFixed(2)}%
                        </p>
                        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, marginBottom: space['3'] }}>
                          {qms.data.click_to_quote.total_quotes} quotes from {(qms.data.click_to_quote.organic_clicks + qms.data.click_to_quote.paid_clicks).toLocaleString()} clicks
                        </p>
                        <div style={{ display: 'flex', gap: space['6'], marginBottom: space['2'] }}>
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                              {(qms.data.click_to_quote.organic_rate * 100).toFixed(2)}%
                            </p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted }}>
                              Organic ({qms.data.click_to_quote.organic_quotes} / {qms.data.click_to_quote.organic_clicks.toLocaleString()})
                            </p>
                          </div>
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                              {(qms.data.click_to_quote.paid_rate * 100).toFixed(2)}%
                            </p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted }}>
                              Paid ({qms.data.click_to_quote.paid_quotes} / {qms.data.click_to_quote.paid_clicks.toLocaleString()})
                            </p>
                          </div>
                        </div>
                      </div>
                    </DashboardCard>
                  )}
                </DashboardGrid>
              </DashboardSection>
            )}

            {qmsAttribution.length > 0 && (
              <DashboardSection title="Source Attribution" description="Where deals come from and how they convert.">
                <div style={{
                  backgroundColor: tc.background.surface,
                  border: `1px solid ${tc.border.default}`,
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-attribution">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                        {['Source', 'Quotes', 'Pipeline', 'Won'].map((h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: `${space['3']} ${space['3']}`,
                              fontFamily: fontFamily.body,
                              fontSize: fontSize.xs,
                              fontWeight: fontWeight.medium,
                              color: tc.text.muted,
                              textAlign: i === 0 ? 'left' : 'right',
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.05em',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {qmsAttribution.map((item) => (
                        <AttributionRow key={item.source} item={item} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </DashboardSection>
            )}

            {qmsRecentDeals.length > 0 && (
              <DashboardSection title="Recent Deals" description="Latest updated quotes from the QMS.">
                <div style={{
                  backgroundColor: tc.background.surface,
                  border: `1px solid ${tc.border.default}`,
                  borderRadius: radius.lg,
                  overflow: 'auto',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }} data-testid="table-recent-deals">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                        {['Quote #', 'Customer', 'Status', 'Value', 'Type', 'Updated'].map((h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: `${space['3']} ${space['3']}`,
                              fontFamily: fontFamily.body,
                              fontSize: fontSize.xs,
                              fontWeight: fontWeight.medium,
                              color: tc.text.muted,
                              textAlign: i === 3 ? 'right' : 'left',
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.05em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {qmsRecentDeals.map((deal) => (
                        <DealRow key={deal.quote_number} deal={deal} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </DashboardSection>
            )}
          </>
        )}

        {!qms.loading && qms.error && (
          <DashboardSection title="QMS Connection Error" description="Unable to load Quote Management System data.">
            <div
              style={{
                padding: space['6'],
                border: `1px solid ${tc.border.default}`,
                borderRadius: radius.lg,
                backgroundColor: tc.background.muted,
              }}
              data-testid="card-qms-error"
            >
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>
                Failed to load QMS data
              </p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                {qms.error}
              </p>
            </div>
          </DashboardSection>
        )}

        {!qms.loading && !qms.error && !qmsAvailable && (
          <DashboardSection title="QMS Integration" description="Connect the Quote Management System to see deal lifecycle metrics.">
            <DashboardGrid columns={{ sm: 1, md: 2, lg: 3 }}>
              <EmptyDataCard title="Quote Aging Buckets" description="Connect QMS to see 0-2, 3-7, 8-14, 15+ day aging." />
              <EmptyDataCard title="Quote-to-Close Rate" description="Connect QMS to track close rates over time." />
              <EmptyDataCard title="Average Time to Close" description="Connect QMS for deal velocity metrics." />
              <EmptyDataCard title="Source Attribution" description="Connect QMS for revenue attribution by source." />
              <EmptyDataCard title="Discount Usage Rate" description="Connect QMS to track discount patterns." />
              <EmptyDataCard title="Status Breakdown" description="Connect QMS for deal lifecycle stage distribution." />
            </DashboardGrid>
          </DashboardSection>
        )}

        <DashboardSection title="Web Analytics" description="Conversion events and pipeline from existing sources.">
          <DashboardGrid columns={{ sm: 1, md: 2, lg: 3 }}>
            <DashboardCard title="Recent Conversions" loading={loading}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }} data-testid="text-warm-conversions">
                {conversions.length}
              </p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>conversion events tracked</p>
            </DashboardCard>
            <DashboardCard title="Pipeline Categories" loading={loading}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }} data-testid="text-warm-pipeline-cats">
                {pipeline.length}
              </p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>active categories</p>
            </DashboardCard>
          </DashboardGrid>
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
