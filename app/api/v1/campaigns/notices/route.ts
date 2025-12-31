import { NextResponse } from 'next/server';

export async function GET() {
  const notices = [
    {
      id: 'notice-1',
      type: 'info',
      message: 'Analytics data may be delayed up to 15 minutes',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];

  return NextResponse.json(notices);
}
