import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  if (campaignId === 'camp-002' || campaignId.startsWith('camp-')) {
    return NextResponse.json({
      id: campaignId,
      name: 'Campaign',
      description: null,
      status: 'RUNNABLE',
      created_at: '2025-01-10T09:00:00Z',
      updated_at: new Date().toISOString(),
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      isRunnable: true,
    });
  }

  return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
}
