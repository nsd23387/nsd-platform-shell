import { NextRequest, NextResponse } from 'next/server';

const mockCampaigns: Record<string, any> = {
  'camp-001': {
    id: 'camp-001',
    status: 'DRAFT',
    canEdit: true,
    canSubmit: true,
    canApprove: false,
    isRunnable: false,
  },
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  if (campaignId === 'camp-001' || campaignId.startsWith('camp-')) {
    return NextResponse.json({
      id: campaignId,
      name: 'Campaign',
      description: null,
      status: 'PENDING_REVIEW',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: new Date().toISOString(),
      canEdit: false,
      canSubmit: false,
      canApprove: true,
      isRunnable: false,
    });
  }

  return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
}
