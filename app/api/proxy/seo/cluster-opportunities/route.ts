import { NextRequest, NextResponse } from 'next/server';
import { getClusterOpportunities, isSeoDbConfigured } from '../../../../../lib/seo-db';

export async function GET(req: NextRequest) {
  if (!isSeoDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const opportunities = await getClusterOpportunities();
    return NextResponse.json({ data: opportunities });
  } catch (err: any) {
    console.error('[seo/cluster-opportunities] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load opportunities' }, { status: 500 });
  }
}
