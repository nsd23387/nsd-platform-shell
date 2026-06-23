import { redirect } from 'next/navigation';

export default function LegacyActionRedirect({ params }: { params: { id: string } }) {
  redirect(`/dashboard/seo/enhancement/${params.id}`);
}
