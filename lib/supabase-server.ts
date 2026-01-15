/**
 * Supabase Server Client - Service Role
 * 
 * This client uses the SUPABASE_SERVICE_ROLE_KEY for server-side operations.
 * It should ONLY be used in API routes (Node runtime), never in client components.
 * 
 * SECURITY:
 * - Service role key bypasses RLS
 * - Only use for trusted server-side operations
 * - Never expose to client
 * 
 * GOVERNANCE (M67-14):
 * - Only allowed mutation: INSERT INTO core.campaigns with status = 'draft'
 * - No writes to activity.events
 * - No writes to leads, orgs, contacts
 * - No execution, approval, sourcing, or readiness logic
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with service role credentials.
 * This client has full database access - use with caution.
 * 
 * SCHEMA BINDING (REQUIRED):
 * The client is explicitly bound to the 'core' schema because:
 * - The campaigns table is in core.campaigns, not public.campaigns
 * - PostgREST requires explicit schema selection for non-public schemas
 * - Use .from('campaigns') NOT .from('core.campaigns')
 * 
 * Without db.schema: 'core', you will get: "Invalid schema: core"
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not configured. ' +
      'Set this environment variable to your Supabase project URL.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'Set this environment variable to enable database writes.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'core', // REQUIRED — campaigns table is in core schema
    },
  });
}

/**
 * Check if Supabase is properly configured for server-side writes.
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return Boolean(
    supabaseUrl &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    serviceRoleKey
  );
}

/**
 * ICP (Ideal Customer Profile) JSONB structure
 * Stored in core.campaigns.icp column
 * 
 * NOTE: description is stored here as metadata since core.campaigns
 * does NOT have a top-level description column.
 */
export interface ICPConfig {
  keywords: string[];
  geographies: string[];
  industries?: string[];
  company_size?: {
    min?: number;
    max?: number;
  };
  metadata?: {
    description?: string;
  };
}

/**
 * Sourcing configuration JSONB structure
 * Stored in core.campaigns.sourcing_config column
 * 
 * benchmarks_only:
 * - true = Planning-only campaign (cannot be executed)
 * - false = Executable campaign (can be run)
 */
export interface SourcingConfig {
  benchmarks_only?: boolean;
  targets?: {
    target_leads?: number | null;
    target_emails?: number | null;
    target_reply_rate?: number | null;
  };
}

/**
 * Lead qualification configuration JSONB structure
 * Stored in core.campaigns.lead_qualification_config column
 */
export interface LeadQualificationConfig {
  job_titles?: string[];
  seniority_levels?: string[];
  roles?: string[];
  require_verified_email?: boolean;
  max_contacts_per_org?: number;
}

/**
 * Campaign row structure for core.campaigns table
 * 
 * CANONICAL SCHEMA - Do not add columns that don't exist in the database.
 * ICP, sourcing, and lead qualification are stored as JSONB objects.
 * 
 * VALID COLUMNS (verified against core.campaigns):
 * - id (uuid, auto-generated)
 * - name (text, required)
 * - status (text, required)
 * - icp (jsonb)
 * - sourcing_config (jsonb)
 * - lead_qualification_config (jsonb)
 * - smartlead_campaign_id (text, nullable)
 * - created_at (timestamptz)
 * - updated_at (timestamptz)
 * 
 * NOT VALID (do not use):
 * - description (use icp.metadata.description instead)
 * - keywords, geographies, industries (use icp JSONB)
 * - target_* (use sourcing_config.targets)
 */
export interface CampaignRow {
  id?: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  icp: ICPConfig;
  sourcing_config: SourcingConfig;
  lead_qualification_config?: LeadQualificationConfig | null;
  smartlead_campaign_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
