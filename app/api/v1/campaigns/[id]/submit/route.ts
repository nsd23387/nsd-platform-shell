import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { id: campaignId } = await context.params;

  if (campaignId.startsWith('camp-')) {
    return NextResponse.json({
      id: campaignId,
      name: 'Campaign',
      description: null,
      status: 'PENDING_REVIEW',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: new Date().toISOString(),
      submittedBy: 'current.user@neonsignsdepot.com',
      submittedAt: new Date().toISOString(),
      canEdit: false,
      canSubmit: false,
      canApprove: true,
      isRunnable: false,
    });
  }

  return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
}
