import { NextResponse } from 'next/server';

export async function GET() {
  const readinessData = {
    total_campaigns: 3,
    by_status: {
      DRAFT: 1,
      PENDING_REVIEW: 1,
      RUNNABLE: 1,
      ARCHIVED: 0,
    },
    blockers: {
      MISSING_HUMAN_APPROVAL: 2,
      KILL_SWITCH_ENABLED: 0,
      NO_LEADS_PERSISTED: 1,
      PERSISTENCE_ERRORS: 0,
      SMARTLEAD_NOT_CONFIGURED: 0,
      INSUFFICIENT_CREDITS: 0,
    },
    blocked_count: 2,
    ready_count: 1,
  };

  return NextResponse.json(readinessData);
}
