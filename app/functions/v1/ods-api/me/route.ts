import { NextResponse } from 'next/server';

/**
 * Mock bootstrap endpoint for development/preview environments.
 * 
 * M68-03: Includes all required top-level keys to prevent UI crashes:
 * - Standard keys: user, organization, roles, permissions, environment, feature_visibility
 * - Additional keys: payload, metadata (required by some UI components)
 */
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
      sales_engine: true,
      campaigns: true,
    },
    // M68-03: Additional required keys to prevent "Cannot read properties of undefined" errors
    payload: {},
    metadata: {},
  };

  return NextResponse.json(mockBootstrapResponse);
}
