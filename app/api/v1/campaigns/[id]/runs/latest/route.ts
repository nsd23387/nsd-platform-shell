import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  const latestRun = {
    id: 'run-001',
    campaign_id: campaignId,
    status: 'COMPLETED',
    started_at: '2025-01-20T08:00:00Z',
    completed_at: '2025-01-20T08:45:00Z',
    leads_processed: 250,
    emails_sent: 248,
    errors: 2,
  };

  return NextResponse.json(latestRun);
}
