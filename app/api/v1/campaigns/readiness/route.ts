import { NextResponse } from 'next/server';

export async function GET() {
  const readiness = {
    total: 3,
    draft: 1,
    pendingReview: 1,
    runnable: 1,
    archived: 0,
    blockers: [
      { reason: 'MISSING_HUMAN_APPROVAL', count: 2 },
      { reason: 'NO_LEADS_PERSISTED', count: 1 },
    ],
  };

  return NextResponse.json(readiness);
}
