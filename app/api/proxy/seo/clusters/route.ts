import { NextRequest, NextResponse } from 'next/server';
import { getClusters, getClusterById, isSeoDbConfigured } from '../../../../../lib/seo-db';

export async function GET(req: NextRequest) {
  if (!isSeoDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const cluster = await getClusterById(id);
      if (!cluster) {
        return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
      }
      return NextResponse.json({ data: cluster });
    }
    const clusters = await getClusters();
    return NextResponse.json({ data: clusters });
  } catch (err: any) {
    console.error('[seo/clusters] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load clusters' }, { status: 500 });
  }
}
