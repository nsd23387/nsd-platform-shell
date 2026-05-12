import { redirect } from 'next/navigation';

// Legacy /clusters path now points to the simplified Actions board
// (the old /recommendations page was removed in the seo_action migration).
export default function SeoClustersPage() {
  redirect('/dashboard/seo/actions');
}
