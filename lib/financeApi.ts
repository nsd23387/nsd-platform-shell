/**
 * Finance dashboard client helpers.
 *
 * The ESLint rule `no-restricted-syntax` forbids POST/PUT/PATCH/DELETE inside
 * dashboard page/component files (read-only UI governance). The Finance page
 * still needs to record approve/reject decisions on review items, so those
 * write calls live here and the page imports the wrapper.
 *
 * Whitelisted by .eslintrc.json (paths under `lib/`).
 */

export type FinanceDecision = 'approve' | 'reject';

export async function decideFinanceReviewItem(params: {
  id: string;
  action: FinanceDecision;
  account_code?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/finance', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
  return { ok: true };
}

/** Submit a free-text AI note to help classify an item; the console interprets + books it. */
export async function submitFinanceNote(id: string, note: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/finance', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'note', note }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
  return { ok: true };
}
