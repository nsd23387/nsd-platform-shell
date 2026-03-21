import { NextRequest, NextResponse } from 'next/server';
import {
  getRecommendations,
  approveRecommendation,
  rejectRecommendation,
  submitFeedback,
  approveExecutionCandidate,
  rejectExecutionCandidate,
  approveByOpportunityId,
  rejectByOpportunityId,
  isSeoDbConfigured,
} from '../../../../../lib/seo-db';

export async function GET(req: NextRequest) {
  if (!isSeoDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const recommendations = await getRecommendations();
    return NextResponse.json({ data: recommendations });
  } catch (err: any) {
    console.error('[seo/recommendations] GET Error:', err.message);
    return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSeoDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { id, action, feedback_text, candidate_id, opportunity_id, review_notes, target } = body;

  if (!action) {
    return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
  }

  try {
    if (target === 'engine' || candidate_id || opportunity_id) {
      if (action === 'approve') {
        if (candidate_id) {
          await approveExecutionCandidate(candidate_id, review_notes);
        } else if (opportunity_id) {
          await approveByOpportunityId(opportunity_id, review_notes);
        } else {
          return NextResponse.json({ error: 'candidate_id or opportunity_id required for engine approval' }, { status: 400 });
        }
      } else if (action === 'reject') {
        if (candidate_id) {
          await rejectExecutionCandidate(candidate_id, review_notes);
        } else if (opportunity_id) {
          await rejectByOpportunityId(opportunity_id, review_notes);
        } else {
          return NextResponse.json({ error: 'candidate_id or opportunity_id required for engine rejection' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'Invalid action for engine target' }, { status: 400 });
      }
      return NextResponse.json({ success: true, action, candidate_id, opportunity_id, target: 'engine' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    if (action === 'approve') {
      await approveRecommendation(id);
    } else if (action === 'reject') {
      await rejectRecommendation(id);
    } else if (action === 'feedback') {
      await submitFeedback(id, feedback_text || '');
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    return NextResponse.json({ success: true, id, action });
  } catch (err: any) {
    console.error('[seo/recommendations] POST Error:', err.message);
    const notFound = err.message?.includes('not found');
    const status = notFound ? 404 : 500;
    const msg = notFound ? err.message : 'Failed to process recommendation action';
    return NextResponse.json({ error: msg }, { status });
  }
}
