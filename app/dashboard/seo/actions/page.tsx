import { redirect } from 'next/navigation';

// Fix 0 / Fix A: "All Recommendations" is merged into the gate-backed Review
// queue. The legacy analytics.seo_action surface (paused agent loop) is retired
// — the SEO Overview / Review screen is the single source of truth for
// gate-accepted changes awaiting a decision. This route now redirects there so
// any bookmarks / deep links land on the live queue instead of a dead page.
export default function ActionsPage() {
  redirect('/dashboard/seo');
}
