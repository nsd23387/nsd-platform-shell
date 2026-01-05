/**
 * Campaign Create API Route - M67-14
 * 
 * POST /api/campaign-create
 * 
 * Creates a campaign in governance_state = DRAFT.
 * No execution or sourcing occurs.
 * 
 * This is a proxy to the M60 Campaign Management API.
 * In development, returns mock response.
 * 
 * M67-14 REQUIRED FIELDS:
 * - name
 * - keywords[] (non-empty)
 * - geographies[] (non-empty)
 * 
 * M67-14 REMOVED (forbidden):
 * - organization_sourcing (derived from ICP)
 * - lead_qualification (minimum_signals forbidden)
 * - technologies, max_organizations, source_type
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  CampaignCreatePayload,
  CampaignCreateSuccessResponse,
  CampaignCreateErrorResponse,
  ValidationError,
} from '../../sales-engine/types/campaign-create';

const M60_API_URL = process.env.SALES_ENGINE_API_BASE_URL || '';

/**
 * M67-14 Payload Validation
 * 
 * REQUIRED:
 * - campaign_identity.name (non-empty string)
 * - icp.keywords (non-empty array)
 * - icp.geographies (non-empty array)
 * 
 * REMOVED validation (per governance):
 * - organization_sourcing (derived from ICP)
 * - lead_qualification (minimum_signals forbidden)
 */
function validatePayload(payload: CampaignCreatePayload): ValidationError[] {
  const errors: ValidationError[] = [];

  // REQUIRED: Campaign name
  if (!payload.campaign_identity?.name?.trim()) {
    errors.push({
      field: 'campaign_identity.name',
      message: 'Campaign name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // REQUIRED: ICP with keywords and geographies
  if (!payload.icp) {
    errors.push({
      field: 'icp',
      message: 'ICP definition is required',
      code: 'REQUIRED_FIELD',
    });
  } else {
    // REQUIRED: keywords[] (non-empty)
    if (!payload.icp.keywords || payload.icp.keywords.length === 0) {
      errors.push({
        field: 'icp.keywords',
        message: 'At least one keyword is required',
        code: 'REQUIRED_FIELD',
      });
    }
    // REQUIRED: geographies[] (non-empty)
    if (!payload.icp.geographies || payload.icp.geographies.length === 0) {
      errors.push({
        field: 'icp.geographies',
        message: 'At least one geography is required',
        code: 'REQUIRED_FIELD',
      });
    }
  }

  // contact_targeting is optional but included
  // outreach_context is optional but included

  return errors;
}

function generateMockResponse(payload: CampaignCreatePayload): CampaignCreateSuccessResponse {
  const campaignId = `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    data: {
      campaign: {
        id: campaignId,
        governance_state: 'DRAFT',
        source_eligible: false,
      },
      icp_snapshot: {
        id: snapshotId,
        campaign_id: campaignId,
      },
    },
    meta: {
      semantics: {
        governance_state: 'DRAFT',
        source_eligible: false,
        targets_gating: false,
      },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: CampaignCreatePayload = await request.json();

    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      const errorResponse: CampaignCreateErrorResponse = {
        success: false,
        error: 'Validation failed',
        validation_errors: validationErrors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (M60_API_URL) {
      try {
        const response = await fetch(`${M60_API_URL}/campaign-create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(request.headers.get('Authorization')
              ? { Authorization: request.headers.get('Authorization')! }
              : {}),
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
      } catch (proxyError) {
        console.error('[campaign-create] Proxy error:', proxyError);
        const mockResponse = generateMockResponse(payload);
        return NextResponse.json(mockResponse);
      }
    }

    const mockResponse = generateMockResponse(payload);
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('[campaign-create] Error:', error);
    const errorResponse: CampaignCreateErrorResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
