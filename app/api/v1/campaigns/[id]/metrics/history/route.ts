import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  await context.params;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const history = [
    {
      timestamp: new Date(now - 6 * day).toISOString(),
      emails_sent: 120,
      emails_opened: 58,
      emails_replied: 8,
      emails_bounced: 3,
    },
    {
      timestamp: new Date(now - 5 * day).toISOString(),
      emails_sent: 145,
      emails_opened: 72,
      emails_replied: 12,
      emails_bounced: 4,
    },
    {
      timestamp: new Date(now - 4 * day).toISOString(),
      emails_sent: 130,
      emails_opened: 65,
      emails_replied: 10,
      emails_bounced: 2,
    },
    {
      timestamp: new Date(now - 3 * day).toISOString(),
      emails_sent: 168,
      emails_opened: 84,
      emails_replied: 15,
      emails_bounced: 5,
    },
    {
      timestamp: new Date(now - 2 * day).toISOString(),
      emails_sent: 155,
      emails_opened: 78,
      emails_replied: 11,
      emails_bounced: 4,
    },
    {
      timestamp: new Date(now - 1 * day).toISOString(),
      emails_sent: 174,
      emails_opened: 66,
      emails_replied: 11,
      emails_bounced: 5,
    },
  ];

  return NextResponse.json(history);
}
