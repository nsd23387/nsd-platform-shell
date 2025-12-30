import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  await context.params;

  const variants = [
    {
      id: 'var-001',
      name: 'Variant A - Professional',
      subject_line: 'Quick question about {{company}}',
      body_preview: 'Hi {{first_name}}, I noticed that {{company}} is expanding and thought you might be interested in how our custom neon signage can help increase foot traffic and brand visibility...',
      weight: 50,
      performance: {
        sent: 446,
        opened: 212,
        replied: 34,
      },
    },
    {
      id: 'var-002',
      name: 'Variant B - Casual',
      subject_line: 'Thought you might find this interesting',
      body_preview: 'Hey {{first_name}}, hope this finds you well! I came across {{company}} and was impressed by your location. Have you considered how a custom LED sign could make you stand out...',
      weight: 50,
      performance: {
        sent: 446,
        opened: 211,
        replied: 33,
      },
    },
  ];

  return NextResponse.json(variants);
}
