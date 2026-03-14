import { NextRequest, NextResponse } from 'next/server';

const ODS_API_URL = process.env.ODS_API_URL || process.env.NEXT_PUBLIC_ODS_API_URL || '';

export async function GET(req: NextRequest) {
  if (!ODS_API_URL) {
    return NextResponse.json({
      data: [
        { id: 'opp-1', cluster_id: 'cluster-1', cluster_topic: 'Custom Neon Signs', opportunity_type: 'optimize_existing_page', total_impressions: 4200, avg_position: 18.3, suggested_action: 'Optimize title tags and H1 for primary keyword "custom neon signs"' },
        { id: 'opp-2', cluster_id: 'cluster-2', cluster_topic: 'Business Logo Signs', opportunity_type: 'create_new_page', total_impressions: 3100, avg_position: 22.5, suggested_action: 'Create dedicated landing page for "business logo neon sign" cluster' },
        { id: 'opp-3', cluster_id: 'cluster-3', cluster_topic: 'LED Sign Pricing', opportunity_type: 'expand_content', total_impressions: 2800, avg_position: 15.7, suggested_action: 'Add pricing comparison section and FAQ schema markup' },
        { id: 'opp-4', cluster_id: 'cluster-4', cluster_topic: 'Restaurant Signage', opportunity_type: 'create_new_page', total_impressions: 1950, avg_position: 28.4, suggested_action: 'Create industry-specific page targeting restaurant neon sign queries' },
        { id: 'opp-5', cluster_id: 'cluster-5', cluster_topic: 'Wedding Neon Signs', opportunity_type: 'optimize_existing_page', total_impressions: 1600, avg_position: 14.2, suggested_action: 'Improve internal linking and add gallery section for wedding signs' },
      ],
    });
  }

  try {
    const apiToken = req.headers.get('authorization') || '';
    const res = await fetch(`${ODS_API_URL}/api/v1/seo/cluster-opportunities`, {
      headers: { 'Authorization': apiToken, 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
