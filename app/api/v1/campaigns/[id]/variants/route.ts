import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockVariants() {
  return [
    {
      id: 'var-001',
      name: 'Variant A - Professional',
      subject_line: 'Quick question about {{company}}',
      body_preview: 'Hi {{first_name}}, I noticed that {{company}} is expanding...',
      weight: 50,
    },
    {
      id: 'var-002',
      name: 'Variant B - Casual',
      subject_line: 'Thought you might find this interesting',
      body_preview: 'Hey {{first_name}}, hope this finds you well...',
      weight: 50,
    },
  ];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockVariants());
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/${params.id}/variants`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockVariants());
  }
}
