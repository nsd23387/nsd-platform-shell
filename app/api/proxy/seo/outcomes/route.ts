import { NextRequest, NextResponse } from 'next/server';
import { getOutcomes, isSeoDbConfigured } from '../../../../../lib/seo-db';

export async function GET(req: NextRequest) {
  if (!isSeoDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const outcomes = await getOutcomes();
    return NextResponse.json({ data: outcomes });
  } catch (err: any) {
    console.error('[seo/outcomes] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load outcomes' }, { status: 500 });
  }
}
