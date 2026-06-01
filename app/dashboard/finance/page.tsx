/**
 * Finance Dashboard
 *
 * Read-only finance analytics sourced from Zoho Books via the finance snapshot
 * published by nsd-finance-console (Supabase: public.finance_snapshots). Plus a
 * review queue (public.finance_review_items): approve books the expense (via the
 * console loop), or leave a free-text note for the AI to classify it.
 *
 * Palette: NSD brand only — violet accents, magenta as a sparing attention cue,
 * navy text. No traffic-light (red/amber/green) colors.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DashboardGrid, MetricCard, DashboardCard } from '../../../components/dashboard';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { violet } from '../../../design/tokens/colors';
import type { FinanceMetrics, FinanceReviewItem, FinanceSnapshot } from '../../../lib/finance-db';
import { decideFinanceReviewItem, submitFinanceNote } from '../../../lib/financeApi';

const ACCENT = violet[600];
const FLAG = '#CC368F'; // NSD magenta — sparing attention/negative emphasis

const usd = (n: number | null | undefined) =>
  n == null ? '—' : (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const confidenceLabel = (item: FinanceReviewItem): string | null => {
  if (item.ai_confidence_score != null) return `${Math.round(item.ai_confidence_score * 100)}% confidence`;
  if (item.ai_confidence) return `${item.ai_confidence} confidence`;
  return null;
};

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
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noted, setNoted] = useState<Record<string, string>>({});

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
      const { ok, error } = await decideFinanceReviewItem({ id: item.id, action, account_code: codes[item.id] || item.suggested_account_code });
      if (!ok) throw new Error(error || 'Decision failed');
      setData(prev => prev ? { ...prev, review_items: prev.review_items.filter(r => r.id !== item.id) } : prev);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Decision failed');
    } finally {
      setBusyId(null);
    }
  }, [codes]);

  const sendNote = useCallback(async (item: FinanceReviewItem) => {
    const note = (notes[item.id] || '').trim();
    if (!note) return;
    setBusyId(item.id);
    try {
      const { ok, error } = await submitFinanceNote(item.id, note);
      if (!ok) throw new Error(error || 'Failed to submit note');
      setNoted(n => ({ ...n, [item.id]: 'Sent to the AI — it will classify and book this shortly.' }));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to submit note');
    } finally {
      setBusyId(null);
    }
  }, [notes]);

  const m: FinanceMetrics | undefined = data?.snapshot?.metrics;
  const asOf = data?.snapshot?.as_of_date || data?.snapshot?.captured_at?.slice(0, 10);

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

  const badge = (text: string) => (
    <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: violet[700], backgroundColor: violet[50], padding: `2px ${space['2']}`, borderRadius: radius.DEFAULT }}>{text}</span>
  );

  return (
    <>
      {header}

      {/* Flags — neutral card, magenta dots */}
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
        Approve the recommended category to book it, adjust the account code, or tell the AI how to classify it in the note box.
      </p>
      {!data?.review_items?.length ? (
        <DashboardCard title="Review Queue" empty emptyMessage="Nothing to review — all caught up." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'] }}>
          {data.review_items.map(item => {
            const code = codes[item.id] || '';
            const canApprove = Boolean(code || item.suggested_account_code) && busyId !== item.id;
            const conf = confidenceLabel(item);
            if (noted[item.id]) {
              return (
                <div key={item.id} style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['5'], display: 'flex', alignItems: 'center', gap: space['3'] }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: FLAG, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>{usd(item.amount)} · {item.memo}</div>
                    <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginTop: space['1'] }}>{noted[item.id]}</div>
                  </div>
                </div>
              );
            }
            return (
              <div key={item.id} style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['5'] }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space['4'] }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                      {usd(item.amount)} <span style={{ fontWeight: fontWeight.normal, fontSize: fontSize.sm, color: tc.text.muted }}>· {item.txn_date} · {item.paid_through}</span>
                    </div>
                    <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, marginTop: space['1'], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '560px' }}>{item.memo}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], marginTop: space['2'] }}>
                      {item.suggested_account ? (
                        <>
                          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>Recommended: <strong style={{ color: tc.text.primary }}>{item.suggested_account}</strong></span>
                          {conf && badge(conf)}
                        </>
                      ) : (
                        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>No recommendation yet — enter an account code or add a note below.</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexShrink: 0 }}>
                    <input
                      value={code}
                      onChange={e => setCodes(c => ({ ...c, [item.id]: e.target.value }))}
                      placeholder="acct code"
                      style={{ width: '92px', padding: `${space['2']} ${space['2.5']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, backgroundColor: tc.background.surface, color: tc.text.primary }}
                    />
                    <button disabled={!canApprove} onClick={() => decide(item, 'approve')} title={canApprove ? 'Book to the recommended/entered account' : 'Enter an account code first'}
                      style={{ padding: `${space['2']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#fff', backgroundColor: ACCENT, border: 'none', borderRadius: radius.md, cursor: canApprove ? 'pointer' : 'not-allowed', opacity: canApprove ? 1 : 0.4 }}>
                      Approve
                    </button>
                    <button disabled={busyId === item.id} onClick={() => decide(item, 'reject')}
                      style={{ padding: `${space['2']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.secondary, backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, cursor: 'pointer' }}>
                      Reject
                    </button>
                  </div>
                </div>
                {/* AI note box */}
                <div style={{ display: 'flex', gap: space['2'], marginTop: space['3'], paddingTop: space['3'], borderTop: `1px solid ${tc.border.subtle}` }}>
                  <input
                    value={notes[item.id] ?? ''}
                    onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') sendNote(item); }}
                    placeholder="Tell the AI how to classify this — e.g. “this is a software subscription” or “Liyu COGS”"
                    style={{ flex: 1, padding: `${space['2']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, backgroundColor: tc.background.surface, color: tc.text.primary }}
                  />
                  <button disabled={busyId === item.id || !(notes[item.id] || '').trim()} onClick={() => sendNote(item)}
                    style={{ padding: `${space['2']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: ACCENT, backgroundColor: violet[50], border: `1px solid ${violet[200]}`, borderRadius: radius.md, cursor: (notes[item.id] || '').trim() ? 'pointer' : 'not-allowed', opacity: (notes[item.id] || '').trim() ? 1 : 0.5 }}>
                    Ask AI
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
