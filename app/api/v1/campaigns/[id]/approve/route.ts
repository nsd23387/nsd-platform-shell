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
      status: 'RUNNABLE',
      created_at: '2025-01-10T09:00:00Z',
      updated_at: new Date().toISOString(),
      submittedBy: 'submitter@neonsignsdepot.com',
      submittedAt: '2025-01-18T16:45:00Z',
      approvedBy: 'current.user@neonsignsdepot.com',
      approvedAt: new Date().toISOString(),
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      isRunnable: true,
    });
  }

  return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
}
