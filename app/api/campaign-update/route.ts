/**
 * Campaign Update API Route
 * 
 * PATCH /api/campaign-update
 * 
 * Updates an existing campaign's configuration.
 * This is a control-plane write for DRAFT campaigns.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - PERMITTED MUTATION: Updates campaign configuration in Supabase
 * - Only DRAFT campaigns can be edited (enforced at UI level)
 * - This does NOT initiate execution or sourcing
 * - No approval, submission, or governance transitions
 * 
 * RUNTIME:
 * - Must run in Node runtime for Supabase service role access
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface UpdateCampaignPayload {
  campaign_id: string;
  name?: string;
  description?: string;
  icp?: {
    keywords?: string[];
    industries?: string[];
    geographies?: string[];
    job_titles?: string[];
    seniority_levels?: string[];
    company_size?: { min: number; max: number };
    roles?: string[];
  };
  contact_targeting?: {
    roles?: string[];
    seniority?: string[];
    max_contacts_per_org?: number;
    email_requirements?: {
      require_verified?: boolean;
      exclude_generic?: boolean;
    };
  };
  outreach_context?: {
    tone?: string;
    value_propositions?: string[];
    pain_points?: string[];
    call_to_action?: string;
  };
  campaign_targets?: {
    target_leads?: number | null;
    target_emails?: number | null;
    target_reply_rate?: number | null;
  };
  sourcing_config?: {
    benchmarks_only?: boolean;
  };
}

export async function PATCH(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { success: false, error: 'Database not configured. Please set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: UpdateCampaignPayload = await request.json();

    if (!body.campaign_id) {
      return NextResponse.json(
        { success: false, error: 'campaign_id is required' },
        { status: 400 }
      );
    }

    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, status, icp, sourcing_config, lead_qualification_config')
      .eq('id', body.campaign_id)
      .single();

    if (fetchError || !existingCampaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // GOVERNANCE: Only DRAFT campaigns can be edited
    const campaignStatus = existingCampaign.status?.toLowerCase();
    if (campaignStatus !== 'draft') {
      return NextResponse.json(
        { success: false, error: `Campaign cannot be edited - status is '${existingCampaign.status}'. Only DRAFT campaigns can be modified.` },
        { status: 409 }
      );
    }

    const existingIcp = existingCampaign.icp || {};
    const existingSourcingConfig = existingCampaign.sourcing_config || {};

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.icp) {
      updateData.icp = {
        ...existingIcp,
        keywords: body.icp.keywords ?? existingIcp.keywords ?? [],
        industries: body.icp.industries ?? existingIcp.industries ?? [],
        geographies: body.icp.geographies ?? existingIcp.geographies ?? [],
        job_titles: body.icp.job_titles ?? existingIcp.job_titles ?? [],
        seniority_levels: body.icp.seniority_levels ?? existingIcp.seniority_levels ?? [],
        company_size: body.icp.company_size ?? existingIcp.company_size,
        roles: body.icp.roles ?? existingIcp.roles ?? [],
      };
    }

    // Build sourcing_config incrementally to avoid overwriting
    let nextSourcingConfig = { ...existingSourcingConfig };

    if (body.contact_targeting) {
      const existingContactTargeting = nextSourcingConfig.contact_targeting || {};
      nextSourcingConfig = {
        ...nextSourcingConfig,
        contact_targeting: {
          ...existingContactTargeting,
          roles: body.contact_targeting.roles ?? existingContactTargeting.roles ?? [],
          seniority: body.contact_targeting.seniority ?? existingContactTargeting.seniority ?? [],
          max_contacts_per_org: body.contact_targeting.max_contacts_per_org ?? existingContactTargeting.max_contacts_per_org ?? 3,
          email_requirements: body.contact_targeting.email_requirements ?? existingContactTargeting.email_requirements,
        },
      };
    }

    if (body.outreach_context) {
      const existingOutreach = nextSourcingConfig.outreach_context || {};
      nextSourcingConfig = {
        ...nextSourcingConfig,
        outreach_context: {
          ...existingOutreach,
          tone: body.outreach_context.tone ?? existingOutreach.tone ?? 'professional',
          value_propositions: body.outreach_context.value_propositions ?? existingOutreach.value_propositions ?? [],
          pain_points: body.outreach_context.pain_points ?? existingOutreach.pain_points ?? [],
          call_to_action: body.outreach_context.call_to_action ?? existingOutreach.call_to_action ?? '',
        },
      };
    }

    if (body.campaign_targets) {
      nextSourcingConfig = {
        ...nextSourcingConfig,
        targets: {
          target_leads: body.campaign_targets.target_leads,
          target_emails: body.campaign_targets.target_emails,
          target_reply_rate: body.campaign_targets.target_reply_rate,
        },
      };
    }

    if (body.sourcing_config?.benchmarks_only !== undefined) {
      nextSourcingConfig = {
        ...nextSourcingConfig,
        benchmarks_only: body.sourcing_config.benchmarks_only,
      };
    }

    // Only update sourcing_config if any changes were made
    if (body.contact_targeting || body.outreach_context || body.campaign_targets || body.sourcing_config?.benchmarks_only !== undefined) {
      updateData.sourcing_config = nextSourcingConfig;
    }

    const { error: updateError } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', body.campaign_id);

    if (updateError) {
      console.error('[campaign-update] Update failed:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: body.campaign_id,
          updated: true,
        },
      },
    });
  } catch (err) {
    console.error('[campaign-update] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
