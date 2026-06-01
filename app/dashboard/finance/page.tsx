/**
 * Finance Dashboard
 *
 * Read-only finance analytics sourced from Zoho Books via the finance snapshot
 * published by nsd-finance-console (Supabase: public.finance_snapshots). Plus a
 * review queue (public.finance_review_items) where approving an item records the
 * categorization decision; the finance-console review loop books it to Zoho.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DashboardGrid, MetricCard, DashboardCard } from '../../../components/dashboard';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { violet } from '../../../design/tokens/colors';
import type { FinanceMetrics, FinanceReviewItem, FinanceSnapshot } from '../../../lib/finance-db';
import { decideFinanceReviewItem } from '../../../lib/financeApi';

// Brand accents only — violet for actions/accents (matches SEO/Exec views),
// NSD magenta used sparingly for attention/negative emphasis. No red/amber/green.
const ACCENT = violet[600];
const FLAG = '#CC368F';

const usd = (n: number | null | undefined) =>
  n == null ? '—' : (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface FinancePayload {
  snapshot: FinanceSnapshot | null;
  review_items: FinanceReviewItem[];
  configured?: boolean;
  error?: string;
}

export default function FinanceDashboard() {
  const tc = useThemeColors();
  const [data, setData] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/finance', { cache: 'no-store' });
      const json = (await res.json()) as FinancePayload;
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
      const seed: Record<string, string> = {};
      for (const it of json.review_items || []) seed[it.id] = it.suggested_account_code || '';
      setCodes(seed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = useCallback(async (item: FinanceReviewItem, action: 'approve' | 'reject') => {
    setBusyId(item.id);
    try {
      const { ok, error } = await decideFinanceReviewItem({
        id: item.id,
        action,
        account_code: codes[item.id] || item.suggested_account_code,
      });
      if (!ok) throw new Error(error || 'Decision failed');
      setData(prev => prev ? { ...prev, review_items: prev.review_items.filter(r => r.id !== item.id) } : prev);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Decision failed');
    } finally {
      setBusyId(null);
    }
  }, [codes]);

  const m: FinanceMetrics | undefined = data?.snapshot?.metrics;
  const asOf = data?.snapshot?.as_of_date || data?.snapshot?.captured_at?.slice(0, 10);

  // ---- header ----
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['8'], paddingBottom: space['6'], borderBottom: `1px solid ${tc.border.default}` }}>
      <div>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['4xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'] }}>Finance</h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
          Cash, reserves, receivables, and the categorization review queue — sourced from Zoho Books.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: space['4'] }}>
        {asOf && <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>As of {asOf}</span>}
        <button onClick={load} style={{ padding: `${space['2']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, backgroundColor: tc.background.surface, color: tc.text.secondary, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>
    </div>
  );

  if (loading) return <>{header}<DashboardGrid columns={4}>{[0,1,2,3].map(i => <MetricCard key={i} title="Loading" loading />)}</DashboardGrid></>;
  if (error) return <>{header}<DashboardCard title="Finance data" error={error} onRetry={load} /></>;
  if (!m) return <>{header}<DashboardCard title="Finance data" empty emptyMessage="No snapshot yet — the finance-console publisher runs hourly." /></>;

  const sectionTitle = (t: string) => (
    <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, margin: `${space['8']} 0 ${space['4']}` }}>{t}</h2>
  );

  return (
    <>
      {header}

      {/* Flags — neutral card, magenta dots; no colored banners */}
      {m.alerts?.length > 0 && (
        <div style={{ marginBottom: space['6'] }}>
          <DashboardCard title="Needs Attention">
            <div style={{ marginTop: space['2'] }}>
              {m.alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: space['3'], padding: `${space['2']} 0`, borderBottom: i < m.alerts.length - 1 ? `1px solid ${tc.border.subtle}` : 'none', fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: FLAG, flexShrink: 0 }} />
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      )}

      {/* KPI cards */}
      <DashboardGrid columns={4}>
        <MetricCard title="Operating Cash" value={usd(m.cash_master)} subtitle="Master account (100100)" />
        <MetricCard title="Net Bank Cash" value={usd(m.bank_cash_total)} subtitle="All USD bank accounts" />
        <MetricCard title="Cards Owed" value={usd(m.card_total)} subtitle="Credit-card balances" />
        <MetricCard title="Uncategorized" value={m.uncategorized_count} subtitle="Bank/card feed items" />
      </DashboardGrid>

      <DashboardGrid columns={3}>
        <MetricCard title="PayPal Clearing" value={usd(m.clearing?.paypal)} subtitle="Unapplied receipts" />
        <MetricCard title="Stripe Clearing" value={usd(m.clearing?.stripe)} subtitle="In transit" />
        <MetricCard title="A/R Outstanding" value={usd(m.ar_aging?.total)} subtitle={`${m.ar_aging?.count || 0} open invoice(s)`} />
      </DashboardGrid>

      {/* Reserves + A/R aging */}
      {sectionTitle('Profit First Reserves')}
      <DashboardGrid columns={2}>
        <DashboardCard title="Reserve Balances">
          <div style={{ marginTop: space['2'] }}>
            {(m.reserves || []).map(r => (
              <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: `${space['2']} 0`, borderBottom: `1px solid ${tc.border.subtle}`, fontFamily: fontFamily.body, fontSize: fontSize.base }}>
                <span style={{ color: tc.text.secondary }}>{r.name}</span>
                <span style={{ fontWeight: fontWeight.medium, color: r.balance < 0 ? FLAG : tc.text.primary }}>{usd(r.balance)}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
        <DashboardCard title="A/R Aging">
          <div style={{ marginTop: space['2'] }}>
            {[['Current', m.ar_aging?.current], ['1–30 days', m.ar_aging?.d1_30], ['31–60 days', m.ar_aging?.d31_60], ['61–90 days', m.ar_aging?.d61_90], ['90+ days', m.ar_aging?.d90_plus]].map(([label, val]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: `${space['2']} 0`, borderBottom: `1px solid ${tc.border.subtle}`, fontFamily: fontFamily.body, fontSize: fontSize.base }}>
                <span style={{ color: tc.text.secondary }}>{label as string}</span>
                <span style={{ fontWeight: fontWeight.medium, color: tc.text.primary }}>{usd(val as number)}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </DashboardGrid>

      {/* Review queue */}
      {sectionTitle(`Review Queue — Uncategorized Transactions${data?.review_items?.length ? ` (${data.review_items.length})` : ''}`)}
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['4'] }}>
        Approve to book the expense to Zoho (via the finance-console loop). Adjust the account code before approving if the suggestion is wrong.
      </p>
      {!data?.review_items?.length ? (
        <DashboardCard title="Review Queue" empty emptyMessage="Nothing to review — all caught up." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'] }}>
          {data.review_items.map(item => (
            <div key={item.id} style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['5'], display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space['4'] }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                  {usd(item.amount)} <span style={{ fontWeight: fontWeight.normal, fontSize: fontSize.sm, color: tc.text.muted }}>· {item.txn_date} · {item.paid_through}</span>
                </div>
                <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, marginTop: space['1'], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '560px' }}>{item.memo}</div>
                {item.suggested_account && <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginTop: space['1'] }}>Suggested: {item.suggested_account}{item.ai_confidence ? ` · ${item.ai_confidence}` : ''}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexShrink: 0 }}>
                <input
                  value={codes[item.id] ?? ''}
                  onChange={e => setCodes(c => ({ ...c, [item.id]: e.target.value }))}
                  placeholder="acct code"
                  style={{ width: '92px', padding: `${space['2']} ${space['2.5']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, backgroundColor: tc.background.surface, color: tc.text.primary }}
                />
                <button disabled={busyId === item.id || !(codes[item.id] || item.suggested_account_code)} onClick={() => decide(item, 'approve')}
                  style={{ padding: `${space['2']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#fff', backgroundColor: ACCENT, border: 'none', borderRadius: radius.md, cursor: 'pointer', opacity: busyId === item.id ? 0.6 : 1 }}>
                  Approve
                </button>
                <button disabled={busyId === item.id} onClick={() => decide(item, 'reject')}
                  style={{ padding: `${space['2']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.secondary, backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, cursor: 'pointer' }}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
