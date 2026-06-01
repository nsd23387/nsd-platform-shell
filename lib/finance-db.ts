/**
 * Finance data access (Postgres / Supabase, public schema).
 *
 * Reads the finance snapshot + review queue published by nsd-finance-console
 * (tables: public.finance_snapshots, public.finance_review_items) and records
 * approve/reject decisions on review items.
 *
 * Connection: uses `pg` over SUPABASE_DATABASE_URL (the same connection string
 * every other dashboard uses — see lib/seo-db.ts), so finance needs no extra
 * env. A direct DB connection also bypasses RLS, so no service-role key is
 * required. Server-only; never import in client components.
 *
 * GOVERNANCE: the ONLY mutation here is updating finance_review_items decision
 * fields (status/decided_*). Booking to Zoho is done downstream by the
 * finance-console review loop — the shell never writes to Zoho directly.
 */

import { Pool } from 'pg';

export interface FinanceSnapshot {
  id: string;
  captured_at: string;
  as_of_date: string | null;
  source: string;
  metrics: FinanceMetrics;
}

export interface FinanceMetrics {
  cash_master: number | null;
  bank_cash_total: number;
  reserves: { name: string; code: string; balance: number }[];
  card_balances: { name: string; code: string; balance: number }[];
  card_total: number;
  clearing: { stripe: number; paypal: number };
  uncategorized_count: number;
  ar_aging: {
    current: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number;
    total: number; count: number;
    top: { number: string; customer: string; balance: number; due_date: string; status: string }[];
  };
  top_expenses: { account: string; amount: number }[];
  pl_trend: { month: string; revenue: number }[];
  alerts: { level: 'info' | 'warn' | 'alert'; text: string }[];
}

export interface FinanceReviewItem {
  id: string;
  transaction_id: string;
  txn_date: string | null;
  amount: number | null;
  paid_through: string | null;
  memo: string | null;
  suggested_account: string | null;
  suggested_account_code: string | null;
  ai_confidence: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'skipped';
}

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('SUPABASE_DATABASE_URL (or DATABASE_URL) is not configured.');
    _pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  }
  return _pool;
}

export function isFinanceConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

const num = (v: unknown): number | null => (v == null ? null : Number(v));

export async function getLatestSnapshot(): Promise<FinanceSnapshot | null> {
  const { rows } = await getPool().query(
    `select id, captured_at, as_of_date, source, metrics
       from public.finance_snapshots
      order by captured_at desc
      limit 1`
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    captured_at: r.captured_at instanceof Date ? r.captured_at.toISOString() : String(r.captured_at),
    as_of_date: r.as_of_date ? String(r.as_of_date).slice(0, 10) : null,
    source: r.source,
    metrics: r.metrics as FinanceMetrics, // jsonb -> object
  };
}

export async function getPendingReviewItems(limit = 200): Promise<FinanceReviewItem[]> {
  const { rows } = await getPool().query(
    `select id, transaction_id, txn_date, amount, paid_through, memo,
            suggested_account, suggested_account_code, ai_confidence, status
       from public.finance_review_items
      where status = 'pending'
      order by txn_date desc nulls last
      limit $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    transaction_id: r.transaction_id,
    txn_date: r.txn_date ? String(r.txn_date).slice(0, 10) : null,
    amount: num(r.amount),
    paid_through: r.paid_through,
    memo: r.memo,
    suggested_account: r.suggested_account,
    suggested_account_code: r.suggested_account_code,
    ai_confidence: r.ai_confidence,
    status: r.status,
  }));
}

export interface DecisionInput {
  id: string;
  action: 'approve' | 'reject';
  account_code?: string | null;
  vendor?: string | null;
  by?: string | null;
}

export async function decideReviewItem(input: DecisionInput): Promise<FinanceReviewItem> {
  const status = input.action === 'approve' ? 'approved' : 'rejected';
  const accountCode = input.action === 'approve' ? (input.account_code ?? null) : null;
  const vendor = input.action === 'approve' ? (input.vendor ?? null) : null;
  const { rows } = await getPool().query(
    `update public.finance_review_items
        set status = $1,
            decided_by = $2,
            decided_at = now(),
            decided_account_code = $3,
            decided_vendor = $4
      where id = $5 and status = 'pending'
      returning id, transaction_id, txn_date, amount, paid_through, memo,
                suggested_account, suggested_account_code, ai_confidence, status`,
    [status, input.by ?? 'dashboard', accountCode, vendor, input.id]
  );
  if (!rows.length) throw new Error('Item not found or no longer pending.');
  const r = rows[0];
  return {
    id: r.id,
    transaction_id: r.transaction_id,
    txn_date: r.txn_date ? String(r.txn_date).slice(0, 10) : null,
    amount: num(r.amount),
    paid_through: r.paid_through,
    memo: r.memo,
    suggested_account: r.suggested_account,
    suggested_account_code: r.suggested_account_code,
    ai_confidence: r.ai_confidence,
    status: r.status,
  };
}
