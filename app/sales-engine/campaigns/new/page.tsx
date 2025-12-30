import { redirect } from 'next/navigation';

export default function NewCampaignRedirect() {
  redirect('/command-center/sales-engine/campaigns/new');
}
