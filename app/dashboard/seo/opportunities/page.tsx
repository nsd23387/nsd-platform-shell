import { redirect } from 'next/navigation';

// Legacy /opportunities path now points to the simplified Actions board
// (the old /recommendations page was removed in the seo_action migration).
export default function SeoOpportunitiesPage() {
  redirect('/dashboard/seo/actions');
}
