import { NextResponse } from 'next/server';

export async function GET() {
  const notices = [
    {
      id: 'notice-001',
      type: 'INFO',
      code: 'ANALYTICS_LAG',
      message: 'Analytics data may be delayed up to 15 minutes',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  return NextResponse.json(notices);
}
