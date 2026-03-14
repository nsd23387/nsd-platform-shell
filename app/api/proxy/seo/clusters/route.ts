import { NextRequest, NextResponse } from 'next/server';

const ODS_API_URL = process.env.ODS_API_URL || process.env.NEXT_PUBLIC_ODS_API_URL || '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const targetUrl = id
    ? `${ODS_API_URL}/api/v1/seo/clusters/${id}`
    : `${ODS_API_URL}/api/v1/seo/clusters`;

  if (!ODS_API_URL) {
    return NextResponse.json({
      data: id ? {
        id: 'cluster-demo-1',
        cluster_topic: 'Custom Neon Signs',
        keyword_count: 12,
        total_impressions: 4200,
        avg_position: 18.3,
        avg_ctr: 2.1,
        primary_keyword: 'custom neon signs',
        members: [
          { keyword: 'custom neon signs', impressions: 1800, clicks: 45, position: 12.1, ctr: 2.5 },
          { keyword: 'custom neon sign for business', impressions: 950, clicks: 22, position: 15.4, ctr: 2.3 },
          { keyword: 'personalized neon signs', impressions: 680, clicks: 14, position: 19.8, ctr: 2.1 },
          { keyword: 'custom led neon sign', impressions: 420, clicks: 8, position: 22.5, ctr: 1.9 },
          { keyword: 'make your own neon sign', impressions: 350, clicks: 6, position: 25.0, ctr: 1.7 },
        ],
      } : [
        { id: 'cluster-1', cluster_topic: 'Custom Neon Signs', keyword_count: 12, total_impressions: 4200, avg_position: 18.3, avg_ctr: 2.1, primary_keyword: 'custom neon signs' },
        { id: 'cluster-2', cluster_topic: 'Business Logo Signs', keyword_count: 8, total_impressions: 3100, avg_position: 22.5, avg_ctr: 1.8, primary_keyword: 'business logo neon sign' },
        { id: 'cluster-3', cluster_topic: 'LED Sign Pricing', keyword_count: 6, total_impressions: 2800, avg_position: 15.7, avg_ctr: 3.2, primary_keyword: 'led sign cost' },
        { id: 'cluster-4', cluster_topic: 'Restaurant Signage', keyword_count: 9, total_impressions: 1950, avg_position: 28.4, avg_ctr: 1.4, primary_keyword: 'restaurant neon sign' },
        { id: 'cluster-5', cluster_topic: 'Wedding Neon Signs', keyword_count: 7, total_impressions: 1600, avg_position: 14.2, avg_ctr: 3.8, primary_keyword: 'wedding neon sign' },
        { id: 'cluster-6', cluster_topic: 'Office Wall Signs', keyword_count: 5, total_impressions: 1100, avg_position: 32.1, avg_ctr: 1.1, primary_keyword: 'office neon sign' },
      ],
    });
  }

  try {
    const apiToken = req.headers.get('authorization') || '';
    const res = await fetch(targetUrl, {
      headers: { 'Authorization': apiToken, 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
