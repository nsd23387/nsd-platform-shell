import { NextResponse } from 'next/server';

export async function GET() {
  const recentRuns = [
    {
      runId: 'run-001',
      campaignId: 'camp-001',
      campaignName: 'Q4 Enterprise Outreach',
      status: 'COMPLETED',
      leadsAttempted: 150,
      leadsSent: 142,
      leadsBlocked: 8,
      completedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      runId: 'run-002',
      campaignId: 'camp-002',
      campaignName: 'SMB Product Launch',
      status: 'PARTIAL',
      leadsAttempted: 75,
      leadsSent: 68,
      leadsBlocked: 7,
      completedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  return NextResponse.json(recentRuns);
}
