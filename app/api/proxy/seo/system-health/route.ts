// =============================================================================
// GET /api/proxy/seo/system-health
// Governance lock: READ-ONLY. Surfaces the latest integrity checks with their
// plain-language catalog and latest remediation attempt for the SEO Command
// Center. No queue, dispatch, learning, or is_active writes.
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        check_name,
        status,
        count,
        run_id,
        run_at,
        sample,
        human_title,
        what_it_means,
        why_it_matters,
        category,
        owner,
        remediation,
        auto_remediated,
        severity_when_failing,
        display_order,
        remediation_id,
        last_remediation_at,
        last_remediation_action,
        last_remediation_result,
        last_remediation_notes,
        last_remediation_target,
        health_group
      FROM analytics.v_seo_system_health
      ORDER BY
        CASE health_group WHEN 'red' THEN 1 WHEN 'amber' THEN 2 ELSE 3 END,
        display_order,
        check_name
    `);

    return NextResponse.json({ data: rows });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/system-health] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load SEO system health' }, { status: 500 });
  }
}
