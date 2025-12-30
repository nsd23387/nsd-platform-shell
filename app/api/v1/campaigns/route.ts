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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let campaigns = Object.values(mockCampaigns);
  
  if (status) {
    campaigns = campaigns.filter((c) => c.status === status);
  }

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const newId = `camp-${Date.now()}`;
  const newCampaign = {
    id: newId,
    name: body.name,
    description: body.description || null,
    status: 'DRAFT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    canEdit: true,
    canSubmit: true,
    canApprove: false,
    isRunnable: false,
    readiness: {
      is_ready: false,
      blocking_reasons: ['MISSING_HUMAN_APPROVAL'],
    },
  };

  mockCampaigns[newId] = newCampaign;
  return NextResponse.json(newCampaign, { status: 201 });
}
