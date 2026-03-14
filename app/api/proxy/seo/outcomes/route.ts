import { NextRequest, NextResponse } from 'next/server';

const ODS_API_URL = process.env.ODS_API_URL || process.env.NEXT_PUBLIC_ODS_API_URL || '';

export async function GET(req: NextRequest) {
  if (!ODS_API_URL) {
    return NextResponse.json({
      data: [
        { id: 'out-1', cluster_topic: 'LED Sign Pricing', keyword: 'led sign cost', page_url: '/pricing', old_position: 15.7, new_position: 8.3, ctr_change: 2.4, traffic_change: 85, execution_date: '2026-03-07T00:00:00Z' },
        { id: 'out-2', cluster_topic: 'LED Sign Pricing', keyword: 'how much do neon signs cost', page_url: '/pricing', old_position: 22.1, new_position: 14.6, ctr_change: 1.1, traffic_change: 42, execution_date: '2026-03-07T00:00:00Z' },
        { id: 'out-3', cluster_topic: 'LED Sign Pricing', keyword: 'neon sign price calculator', page_url: '/pricing', old_position: 31.4, new_position: 19.8, ctr_change: 0.8, traffic_change: 28, execution_date: '2026-03-07T00:00:00Z' },
      ],
    });
  }

  try {
    const apiToken = req.headers.get('authorization') || '';
    const res = await fetch(`${ODS_API_URL}/api/v1/seo/outcomes`, {
      headers: { 'Authorization': apiToken, 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
