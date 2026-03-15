import { NextRequest, NextResponse } from 'next/server';
import {
  getRecommendations,
  approveRecommendation,
  rejectRecommendation,
  submitFeedback,
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
  const { id, action, feedback_text } = body;

  if (!id || !action) {
    return NextResponse.json({ error: 'Missing required fields: id, action' }, { status: 400 });
  }

  try {
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
    const status = err.message === 'Recommendation not found' ? 404 : 500;
    const msg = status === 404 ? err.message : 'Failed to process recommendation action';
    return NextResponse.json({ error: msg }, { status });
  }
}
