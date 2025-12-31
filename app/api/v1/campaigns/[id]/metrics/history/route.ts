import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const history = Array.from({ length: 7 }, (_, i) => ({
    timestamp: new Date(now - (6 - i) * day).toISOString(),
    emails_sent: Math.floor(Math.random() * 150) + 50,
    emails_opened: Math.floor(Math.random() * 80) + 20,
    emails_replied: Math.floor(Math.random() * 15) + 5,
  }));

  return NextResponse.json(history);
}
