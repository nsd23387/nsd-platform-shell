import { NextResponse } from 'next/server';

export async function GET() {
  const recentRuns = [
    {
      id: 'run-001',
      campaign_id: 'camp-003',
      campaign_name: 'Re-engagement Campaign',
      status: 'COMPLETED',
      started_at: new Date(Date.now() - 7200000).toISOString(),
      completed_at: new Date(Date.now() - 3600000).toISOString(),
      leads_attempted: 150,
      leads_sent: 142,
      leads_blocked: 8,
    },
    {
      id: 'run-002',
      campaign_id: 'camp-003',
      campaign_name: 'Re-engagement Campaign',
      status: 'PARTIAL',
      started_at: new Date(Date.now() - 86400000).toISOString(),
      completed_at: new Date(Date.now() - 82800000).toISOString(),
      leads_attempted: 200,
      leads_sent: 178,
      leads_blocked: 22,
    },
    {
      id: 'run-003',
      campaign_id: 'camp-003',
      campaign_name: 'Re-engagement Campaign',
      status: 'COMPLETED',
      started_at: new Date(Date.now() - 172800000).toISOString(),
      completed_at: new Date(Date.now() - 169200000).toISOString(),
      leads_attempted: 100,
      leads_sent: 98,
      leads_blocked: 2,
    },
  ];

  return NextResponse.json(recentRuns);
}
