import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  const runs = [
    {
      id: 'run-001',
      campaign_id: campaignId,
      status: 'COMPLETED',
      started_at: '2025-01-20T08:00:00Z',
      completed_at: '2025-01-20T08:45:00Z',
      leads_processed: 250,
      emails_sent: 248,
      errors: 2,
    },
    {
      id: 'run-002',
      campaign_id: campaignId,
      status: 'COMPLETED',
      started_at: '2025-01-19T08:00:00Z',
      completed_at: '2025-01-19T08:38:00Z',
      leads_processed: 200,
      emails_sent: 200,
      errors: 0,
    },
    {
      id: 'run-003',
      campaign_id: campaignId,
      status: 'PARTIAL',
      started_at: '2025-01-18T08:00:00Z',
      completed_at: '2025-01-18T08:22:00Z',
      leads_processed: 150,
      emails_sent: 142,
      errors: 8,
    },
  ];

  return NextResponse.json(runs);
}
