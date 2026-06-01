/**
 * Finance data access (Supabase, public schema).
 *
 * Reads the finance snapshot + review queue published by nsd-finance-console
 * (tables: public.finance_snapshots, public.finance_review_items) and records
 * approve/reject decisions on review items.
 *
 * SECURITY / GOVERNANCE:
 * - Uses the service-role key (server-only; never import in client components).
 * - Bound to the `public` schema (finance tables live there), unlike
 *   supabase-server.ts which is bound to `core` for campaigns.
 * - The ONLY mutation allowed here is updating finance_review_items decision
 *   fields (status/decided_*). Booking to Zoho is done downstream by the
 *   finance-console review loop — the shell never writes to Zoho directly.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

let _client: SupabaseClient | null = null;

export function financeClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || url === 'https://placeholder.supabase.co' || !key) {
    throw new Error('Supabase not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });
  return _client;
}

export function isFinanceConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && url !== 'https://placeholder.supabase.co' && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getLatestSnapshot(): Promise<FinanceSnapshot | null> {
  const { data, error } = await financeClient()
    .from('finance_snapshots')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FinanceSnapshot) ?? null;
}

export async function getPendingReviewItems(limit = 200): Promise<FinanceReviewItem[]> {
  const { data, error } = await financeClient()
    .from('finance_review_items')
    .select('*')
    .eq('status', 'pending')
    .order('txn_date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as FinanceReviewItem[]) ?? [];
}

export interface DecisionInput {
  id: string;
  action: 'approve' | 'reject';
  account_code?: string | null;
  vendor?: string | null;
  by?: string | null;
}

export async function decideReviewItem(input: DecisionInput): Promise<FinanceReviewItem> {
  const patch: Record<string, unknown> = {
    status: input.action === 'approve' ? 'approved' : 'rejected',
    decided_by: input.by ?? 'dashboard',
    decided_at: new Date().toISOString(),
  };
  if (input.action === 'approve') {
    patch.decided_account_code = input.account_code ?? null;
    patch.decided_vendor = input.vendor ?? null;
  }
  const { data, error } = await financeClient()
    .from('finance_review_items')
    .update(patch)
    .eq('id', input.id)
    .eq('status', 'pending') // never overwrite an already-decided/applied item
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Item not found or no longer pending.');
  return data as FinanceReviewItem;
}
