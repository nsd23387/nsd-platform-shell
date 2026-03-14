import { NextRequest, NextResponse } from 'next/server';

const ODS_API_URL = process.env.ODS_API_URL || process.env.NEXT_PUBLIC_ODS_API_URL || '';

const MOCK_RECOMMENDATIONS = [
  {
    id: 'rec-1', cluster_id: 'cluster-1', cluster_topic: 'Custom Neon Signs', primary_keyword: 'custom neon signs',
    recommended_action: 'Optimize existing page', recommended_url: '/custom-neon-signs',
    recommended_title: 'Custom Neon Signs | Design Your Own LED Sign Online',
    recommended_meta_description: 'Create custom neon signs for your business or home. Design your own LED neon sign with our online tool. Free shipping on orders over $100.',
    target_url: 'https://neonsignsdepot.com/custom-neon-signs', opportunity_type: 'optimize_existing_page',
    estimated_impact: 'High — could move from position 18 to top 10', status: 'pending_review', created_at: '2026-03-10T14:00:00Z',
  },
  {
    id: 'rec-2', cluster_id: 'cluster-2', cluster_topic: 'Business Logo Signs', primary_keyword: 'business logo neon sign',
    recommended_action: 'Create new landing page', recommended_url: '/business-logo-neon-signs',
    recommended_title: 'Business Logo Neon Signs | Custom Brand Signage',
    recommended_meta_description: 'Turn your business logo into a custom neon sign. Professional LED logo signs for offices, storefronts, and events.',
    target_url: '', opportunity_type: 'create_new_page',
    estimated_impact: 'Medium — new page targeting 3,100 monthly impressions', status: 'pending_review', created_at: '2026-03-09T10:30:00Z',
  },
  {
    id: 'rec-3', cluster_id: 'cluster-3', cluster_topic: 'LED Sign Pricing', primary_keyword: 'led sign cost',
    recommended_action: 'Expand content with pricing guide', recommended_url: '/led-sign-pricing',
    recommended_title: 'LED Neon Sign Pricing Guide | How Much Do Custom Signs Cost?',
    recommended_meta_description: 'Complete LED neon sign pricing guide. Compare costs by size, complexity, and type. Get an instant quote for your custom sign.',
    target_url: 'https://neonsignsdepot.com/pricing', opportunity_type: 'expand_content',
    estimated_impact: 'High — position 15.7 with strong CTR indicates high intent', status: 'approved', created_at: '2026-03-05T09:15:00Z',
  },
  {
    id: 'rec-4', cluster_id: 'cluster-5', cluster_topic: 'Wedding Neon Signs', primary_keyword: 'wedding neon sign',
    recommended_action: 'Optimize existing page with gallery', recommended_url: '/wedding-neon-signs',
    recommended_title: 'Wedding Neon Signs | Custom Signs for Your Big Day',
    recommended_meta_description: 'Beautiful custom wedding neon signs. Popular designs include names, dates, and "better together" signs. Ships in 5-7 business days.',
    target_url: 'https://neonsignsdepot.com/wedding-neon-signs', opportunity_type: 'optimize_existing_page',
    estimated_impact: 'Medium — already at position 14 with 3.8% CTR', status: 'rejected', created_at: '2026-03-01T16:45:00Z',
  },
];

export async function GET(req: NextRequest) {
  if (!ODS_API_URL) {
    return NextResponse.json({ data: MOCK_RECOMMENDATIONS });
  }

  try {
    const apiToken = req.headers.get('authorization') || '';
    const res = await fetch(`${ODS_API_URL}/api/v1/seo/recommendations`, {
      headers: { 'Authorization': apiToken, 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, action, feedback_text } = body;

  if (!id || !action) {
    return NextResponse.json({ error: 'Missing required fields: id, action' }, { status: 400 });
  }

  if (!ODS_API_URL) {
    return NextResponse.json({ success: true, id, action });
  }

  try {
    const apiToken = req.headers.get('authorization') || '';
    let targetUrl = '';
    let payload: any = {};

    if (action === 'approve') {
      targetUrl = `${ODS_API_URL}/api/v1/seo/recommendations/${id}/approve`;
    } else if (action === 'reject') {
      targetUrl = `${ODS_API_URL}/api/v1/seo/recommendations/${id}/reject`;
    } else if (action === 'feedback') {
      targetUrl = `${ODS_API_URL}/api/v1/seo/recommendations/${id}/feedback`;
      payload = { feedback_text };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Authorization': apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
