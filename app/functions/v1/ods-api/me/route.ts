import { NextResponse } from 'next/server';

export async function GET() {
  const mockBootstrapResponse = {
    user: {
      id: 'dev-user-001',
      email: 'developer@nsd.local',
      name: 'Development User',
      avatar_url: undefined,
    },
    organization: {
      id: 'org-dev-001',
      name: 'NSD Development',
      slug: 'nsd-dev',
    },
    roles: ['admin', 'viewer'],
    permissions: [
      'dashboard:executive:view',
      'dashboard:operations:view',
      'dashboard:design:view',
      'dashboard:media:view',
      'dashboard:sales:view',
    ],
    environment: {
      name: 'development' as const,
      api_version: '1.0.0',
    },
    feature_visibility: {
      executive_dashboard: true,
      operations_dashboard: true,
      design_dashboard: true,
      media_dashboard: true,
      sales_dashboard: true,
    },
  };

  return NextResponse.json(mockBootstrapResponse);
}
