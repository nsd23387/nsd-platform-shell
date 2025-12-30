import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id: campaignId } = await context.params;

  const latestRun = {
    id: 'run-001',
    campaign_id: campaignId,
    status: 'COMPLETED',
    started_at: '2025-01-20T08:00:00Z',
    completed_at: '2025-01-20T08:45:00Z',
    leads_processed: 250,
    emails_sent: 248,
    errors: 2,
    triggered_by: 'Scheduler',
  };

  return NextResponse.json(latestRun);
}
