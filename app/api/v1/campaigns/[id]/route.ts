import { NextRequest, NextResponse } from 'next/server';

const mockCampaigns: Record<string, any> = {
  'camp-001': {
    id: 'camp-001',
    name: 'Q1 Outreach Campaign',
    description: 'Initial outreach to enterprise prospects',
    status: 'DRAFT',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-20T14:30:00Z',
    canEdit: true,
    canSubmit: true,
    canApprove: false,
    isRunnable: false,
    readiness: {
      is_ready: false,
      blocking_reasons: ['MISSING_HUMAN_APPROVAL'],
    },
  },
  'camp-002': {
    id: 'camp-002',
    name: 'Product Launch Sequence',
    description: 'Multi-touch campaign for new product launch',
    status: 'PENDING_REVIEW',
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-18T16:45:00Z',
    canEdit: false,
    canSubmit: false,
    canApprove: true,
    isRunnable: false,
    readiness: {
      is_ready: false,
      blocking_reasons: ['MISSING_HUMAN_APPROVAL'],
    },
  },
  'camp-003': {
    id: 'camp-003',
    name: 'Re-engagement Campaign',
    description: 'Targeting dormant leads',
    status: 'RUNNABLE',
    created_at: '2025-01-05T11:00:00Z',
    updated_at: '2025-01-17T10:00:00Z',
    canEdit: false,
    canSubmit: false,
    canApprove: false,
    isRunnable: true,
    readiness: {
      is_ready: true,
      blocking_reasons: [],
    },
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = mockCampaigns[params.id];
  
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = mockCampaigns[params.id];
  
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (!campaign.canEdit) {
    return NextResponse.json({ error: 'Campaign cannot be edited' }, { status: 403 });
  }

  const body = await request.json();
  
  if (body.name) campaign.name = body.name;
  if (body.description !== undefined) campaign.description = body.description;
  campaign.updated_at = new Date().toISOString();

  return NextResponse.json(campaign);
}
