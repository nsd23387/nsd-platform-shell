/**
 * Finance API route.
 *
 * GET   -> latest finance snapshot + pending review queue (read-only analytics).
 * PATCH -> record an approve/reject decision on a review item. The decision is
 *          written to Supabase only; the finance-console review loop books
 *          approved items to Zoho. The shell never calls Zoho directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  isFinanceConfigured,
  getLatestSnapshot,
  getPendingReviewItems,
  decideReviewItem,
} from '../../../lib/finance-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isFinanceConfigured()) {
    return NextResponse.json({ snapshot: null, review_items: [], configured: false });
  }
  try {
    const [snapshot, review_items] = await Promise.all([
      getLatestSnapshot(),
      getPendingReviewItems(),
    ]);
    return NextResponse.json({ snapshot, review_items, configured: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load finance data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isFinanceConfigured()) {
    return NextResponse.json({ error: 'Finance data store not configured' }, { status: 503 });
  }
  let body: { id?: string; action?: string; account_code?: string | null; vendor?: string | null; by?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { id, action } = body;
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Body requires { id, action: "approve" | "reject" }' }, { status: 400 });
  }
  if (action === 'approve' && !body.account_code) {
    return NextResponse.json({ error: 'Approve requires an account_code' }, { status: 400 });
  }
  try {
    const item = await decideReviewItem({
      id, action,
      account_code: body.account_code ?? null,
      vendor: body.vendor ?? null,
      by: body.by ?? null,
    });
    return NextResponse.json({ item });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to record decision';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
