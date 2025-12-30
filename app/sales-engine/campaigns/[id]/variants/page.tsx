import { redirect } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default function CampaignVariantsRedirect({ params }: Props) {
  redirect(`/command-center/sales-engine/campaigns/${params.id}/variants`);
}
