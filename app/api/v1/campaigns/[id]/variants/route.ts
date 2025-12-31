import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const variants = [
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

  return NextResponse.json(variants);
}
