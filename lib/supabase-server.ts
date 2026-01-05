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
 * Note: We use the 'core' schema for campaigns table.
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
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'core', // Use core schema for campaigns
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
 */
export interface ICPConfig {
  keywords: string[];
  geographies: string[];
  industries?: string[];
  company_size?: {
    min?: number;
    max?: number;
  };
}

/**
 * Sourcing configuration JSONB structure
 * Stored in core.campaigns.sourcing_config column
 * 
 * NOTE: Targets are benchmarks only - they do NOT gate execution
 */
export interface SourcingConfig {
  benchmarks_only: true; // Always true - targets never gate execution
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
 */
export interface CampaignRow {
  id?: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  icp: ICPConfig;
  sourcing_config: SourcingConfig;
  lead_qualification_config?: LeadQualificationConfig | null;
  created_at?: string;
  updated_at?: string;
}
