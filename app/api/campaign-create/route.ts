/**
 * Campaign Create API Route - M67-14
 * 
 * POST /api/campaign-create
 * 
 * Creates a campaign in core.campaigns with status = 'draft'.
 * This is a control-plane write, not execution.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Only allowed mutation: INSERT INTO core.campaigns
 * - No writes to activity.events
 * - No writes to leads, orgs, contacts
 * - No execution, approval, sourcing, or readiness logic
 * 
 * M67-14 REQUIRED FIELDS:
 * - name (non-empty string)
 * - keywords[] (non-empty array)
 * - geographies[] (non-empty array)
 * 
 * RUNTIME:
 * - Must run in Node runtime (not Edge) for Supabase service role access
 */

// Force Node.js runtime - required for Supabase service role key
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured, CampaignRow } from '../../../lib/supabase-server';
import type {
  CampaignCreatePayload,
  CampaignCreateSuccessResponse,
  CampaignCreateErrorResponse,
  ValidationError,
} from '../../sales-engine/types/campaign-create';

/**
 * M67-14 Payload Validation
 * 
 * REQUIRED:
 * - campaign_identity.name (non-empty string)
 * - icp.keywords (non-empty array)
 * - icp.geographies (non-empty array)
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

  return errors;
}

/**
 * Map UI payload to database row structure.
 * 
 * GOVERNANCE: Only maps to allowed columns.
 * Status is ALWAYS 'draft' - no other status allowed from this endpoint.
 */
function mapPayloadToRow(payload: CampaignCreatePayload): Omit<CampaignRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: payload.campaign_identity.name.trim(),
    status: 'draft', // ALWAYS draft - governance requirement
    keywords: payload.icp.keywords,
    target_locations: payload.icp.geographies,
    description: payload.campaign_identity.description || null,
    industries: payload.icp.industries || null,
    job_titles: payload.icp.job_titles || null,
    seniority_levels: payload.icp.seniority_levels || null,
    company_size_min: payload.icp.company_size?.min || null,
    company_size_max: payload.icp.company_size?.max || null,
    target_leads: payload.campaign_targets?.target_leads || null,
    target_emails: payload.campaign_targets?.target_emails || null,
    target_reply_rate: payload.campaign_targets?.target_reply_rate || null,
  };
}

export async function POST(request: NextRequest) {
  console.log('[campaign-create] Received request');

  try {
    // Parse and validate payload
    const payload: CampaignCreatePayload = await request.json();
    console.log('[campaign-create] Payload received:', JSON.stringify(payload, null, 2));

    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      console.log('[campaign-create] Validation failed:', validationErrors);
      const errorResponse: CampaignCreateErrorResponse = {
        success: false,
        error: 'Validation failed',
        validation_errors: validationErrors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.error('[campaign-create] Supabase not configured - missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
      const errorResponse: CampaignCreateErrorResponse = {
        success: false,
        error: 'Database not configured. Please set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.',
      };
      return NextResponse.json(errorResponse, { status: 503 });
    }

    // Create Supabase client with service role
    const supabase = createServerClient();
    console.log('[campaign-create] Supabase client created');

    // Map payload to database row
    const campaignRow = mapPayloadToRow(payload);
    console.log('[campaign-create] Inserting row:', JSON.stringify(campaignRow, null, 2));

    // INSERT INTO core.campaigns
    // GOVERNANCE: This is the ONLY allowed write operation
    const { data, error } = await supabase
      .from('campaigns')
      .insert(campaignRow)
      .select('id, name, status, created_at')
      .single();

    if (error) {
      console.error('[campaign-create] Supabase insert error:', error);
      const errorResponse: CampaignCreateErrorResponse = {
        success: false,
        error: `Database error: ${error.message}`,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    if (!data) {
      console.error('[campaign-create] No data returned from insert');
      const errorResponse: CampaignCreateErrorResponse = {
        success: false,
        error: 'Campaign created but no data returned',
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    console.log('[campaign-create] Campaign created successfully:', data);

    // Return success response
    const successResponse: CampaignCreateSuccessResponse = {
      success: true,
      data: {
        campaign: {
          id: data.id,
          governance_state: 'DRAFT',
          source_eligible: false,
        },
        icp_snapshot: {
          id: `snap_${data.id}`, // Placeholder - ICP snapshot not implemented yet
          campaign_id: data.id,
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

    return NextResponse.json(successResponse, { status: 201 });
  } catch (error) {
    console.error('[campaign-create] Unexpected error:', error);
    const errorResponse: CampaignCreateErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
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
