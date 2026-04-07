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

  let body: any;
  try {
    body = await req.json();
  } catch (parseErr: any) {
    console.error('[seo/recommendations] POST body parse error:', parseErr.message);
    return NextResponse.json({
      error: 'Invalid or missing request body',
      action: null, mode: null, target: null,
      has_candidate_id: false, has_opportunity_id: false,
    }, { status: 400 });
  }

  const { id, action, feedback_text, candidate_id, opportunity_id, review_notes, target, proposed_value, target_page_url } = body || {};

  console.log(`[seo/recommendations] POST received | action=${action} target=${target} candidate_id=${candidate_id || 'none'} opportunity_id=${opportunity_id || 'none'} id=${id || 'none'}`);

  if (!action) {
    return NextResponse.json({
      error: 'Missing required field: action',
      action: null, mode: null, target: target || null,
      has_candidate_id: !!candidate_id, has_opportunity_id: !!opportunity_id,
    }, { status: 400 });
  }

  try {
    if (target === 'engine' || candidate_id || opportunity_id) {
      const approvalMode = candidate_id ? 'candidate' : 'opportunity';
      const identifier = candidate_id || opportunity_id;
      console.log(`[seo/recommendations] Engine ${action} | mode=${approvalMode} | id=${identifier}`);

      if (action === 'approve') {
        if (candidate_id) {
          await approveExecutionCandidate(candidate_id, review_notes);
          console.log(`[seo/recommendations] Approved candidate ${candidate_id}`);
        } else if (opportunity_id) {
          const result = await approveByOpportunityId(opportunity_id, review_notes, {
            proposed_value: typeof proposed_value === 'string' && proposed_value ? proposed_value : undefined,
            target_page_url: typeof target_page_url === 'string' && target_page_url ? target_page_url : undefined,
          });
          console.log(`[seo/recommendations] Approve by opportunity: mode=${result.mode}, rows=${result.rowCount}`);
        } else {
          return NextResponse.json({
            error: 'candidate_id or opportunity_id required for engine approval',
            action, target, mode: 'engine',
            has_candidate_id: false, has_opportunity_id: false,
          }, { status: 400 });
        }
      } else if (action === 'reject') {
        if (candidate_id) {
          await rejectExecutionCandidate(candidate_id, review_notes);
          console.log(`[seo/recommendations] Rejected candidate ${candidate_id}`);
        } else if (opportunity_id) {
          const result = await rejectByOpportunityId(opportunity_id, review_notes);
          console.log(`[seo/recommendations] Reject by opportunity: mode=${result.mode}, rows=${result.rowCount}`);
          if (result.mode === 'error') {
            return NextResponse.json({ success: false, action: 'reject', opportunity_id, reason: result.error || 'Unknown error' }, { status: 500 });
          }
          if (result.mode === 'not_found') {
            return NextResponse.json({ success: false, action: 'reject', opportunity_id, reason: 'Opportunity not found in execution queue or recommendations' }, { status: 404 });
          }
        } else {
          return NextResponse.json({
            error: 'candidate_id or opportunity_id required for engine rejection',
            action, target, mode: 'engine',
            has_candidate_id: false, has_opportunity_id: false,
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({
          error: 'Invalid action for engine target',
          action, target, mode: 'engine',
          has_candidate_id: !!candidate_id, has_opportunity_id: !!opportunity_id,
        }, { status: 400 });
      }
      return NextResponse.json({ success: true, action, candidate_id, opportunity_id, target: 'engine' });
    }

    if (!id) {
      return NextResponse.json({
        error: 'Missing required field: id',
        action, target,
        has_candidate_id: !!candidate_id, has_opportunity_id: !!opportunity_id,
      }, { status: 400 });
    }

    if (action === 'approve') {
      await approveRecommendation(id);
    } else if (action === 'reject') {
      await rejectRecommendation(id);
    } else if (action === 'feedback') {
      await submitFeedback(id, feedback_text || '');
    } else {
      return NextResponse.json({
        error: 'Invalid action',
        action, mode: 'legacy', target: null,
        has_candidate_id: false, has_opportunity_id: false,
      }, { status: 400 });
    }
    return NextResponse.json({ success: true, id, action });
  } catch (err: any) {
    const approvalMode = candidate_id ? 'candidate' : opportunity_id ? 'opportunity' : 'legacy';
    const helperName = candidate_id
      ? (action === 'approve' ? 'approveExecutionCandidate' : 'rejectExecutionCandidate')
      : opportunity_id
      ? (action === 'approve' ? 'approveByOpportunityId' : 'rejectByOpportunityId')
      : (action === 'approve' ? 'approveRecommendation' : action === 'reject' ? 'rejectRecommendation' : 'submitFeedback');
    console.error(`[seo/recommendations] POST Error | action=${action} mode=${approvalMode} helper=${helperName}:`, err.message);
    const notFound = err.message?.includes('not found');
    const status = notFound ? 404 : 500;
    const msg = notFound ? err.message : 'Failed to process recommendation action';
    return NextResponse.json({
      error: msg, action, mode: approvalMode, target: target || null,
      has_candidate_id: !!candidate_id, has_opportunity_id: !!opportunity_id,
    }, { status });
  }
}
