export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

// Build a single enhancement object from a package row + its member candidates
function buildEnhancement(pkg: Record<string, unknown>, members: Record<string, unknown>[]) {
  return {
    enhancement_id: pkg.enhancement_id,
    canonical_url: pkg.canonical_url,
    version: Number(pkg.version ?? 1),
    lifecycle_state: pkg.lifecycle_state ?? 'evaluating',
    change_count: members.length,
    member_candidate_ids: members.map((m) => m.candidate_id),
    fields: members.map((m) => ({
      candidate_id: m.candidate_id,
      mutation_type: m.mutation_type,
      current_value_snapshot: m.current_value_snapshot ?? null,
      proposed_value: m.proposed_value ?? '',
      quality_self_score: Number(m.quality_self_score ?? 0),
      publish_live: m.publish_live === true,
      guard_reason: m.guard_reason ?? undefined,
    })),
    has_live_members: members.some((m) => m.publish_live === true),
    has_qa_warnings: members.some((m) => m.qa_status === 'warn' || m.qa_status === 'fail'),
    created_at: pkg.created_at ?? new Date().toISOString(),
    evaluation_start_at: pkg.evaluation_start_at ?? undefined,
    lifecycle_policy_first_days: Number(pkg.lifecycle_policy_first_days ?? 30),
    lifecycle_policy_final_days: Number(pkg.lifecycle_policy_final_days ?? 60),
  };
}

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const id = (req.nextUrl.searchParams.get('id') || '').trim();

  try {
    if (id) {
      // Single enhancement
      const pkgRes = await pool.query(
        `SELECT * FROM analytics.seo_page_enhancement WHERE enhancement_id = $1 LIMIT 1`,
        [id],
      );
      if (pkgRes.rows.length === 0) {
        return NextResponse.json({ error: 'Enhancement not found' }, { status: 404 });
      }
      const pkg = pkgRes.rows[0];
      const membersRes = await pool.query(
        `SELECT c.candidate_id, c.mutation_type, c.current_value_snapshot, c.proposed_value,
                COALESCE(c.quality_self_score, 0) AS quality_self_score,
                COALESCE(pp.auto_publish, false) AS publish_live,
                c.qa_status,
                c.guard_reason
         FROM analytics.seo_execution_candidate c
         LEFT JOIN analytics.seo_mutation_publish_policy pp ON pp.mutation_type = c.mutation_type
         WHERE c.enhancement_id = $1
         ORDER BY c.created_at`,
        [id],
      );
      return NextResponse.json({ data: buildEnhancement(pkg, membersRes.rows) });
    }

    // Full queue — packages pending review
    const pkgRes = await pool.query(`
      SELECT * FROM analytics.seo_page_enhancement
      WHERE lifecycle_state NOT IN ('winner','retired','inconclusive')
         OR lifecycle_state IS NULL
      ORDER BY created_at DESC
      LIMIT 200
    `);

    const enhancements = await Promise.all(
      pkgRes.rows.map(async (pkg: Record<string, unknown>) => {
        const membersRes = await pool.query(
          `SELECT c.candidate_id, c.mutation_type, c.current_value_snapshot, c.proposed_value,
                  COALESCE(c.quality_self_score, 0) AS quality_self_score,
                  COALESCE(pp.auto_publish, false) AS publish_live,
                  c.qa_status,
                  c.guard_reason
           FROM analytics.seo_execution_candidate c
           LEFT JOIN analytics.seo_mutation_publish_policy pp ON pp.mutation_type = c.mutation_type
           WHERE c.enhancement_id = $1
           ORDER BY c.created_at`,
          [pkg.enhancement_id],
        );
        return buildEnhancement(pkg, membersRes.rows);
      }),
    );

    return NextResponse.json({ data: enhancements });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/enhancement-queue] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load enhancement queue' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: { enhancement_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { enhancement_id, action } = body;
  if (!enhancement_id || !action) {
    return NextResponse.json({ error: 'Missing enhancement_id or action' }, { status: 400 });
  }
  if (action !== 'release' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be release or reject' }, { status: 400 });
  }

  try {
    if (action === 'release') {
      // Attempt RPC first; fall back to direct update if function doesn't exist
      await pool.query(
        `UPDATE analytics.seo_page_enhancement
         SET lifecycle_state = 'evaluating', evaluation_start_at = NOW()
         WHERE enhancement_id = $1`,
        [enhancement_id],
      );
      // Also approve member candidates
      await pool.query(
        `UPDATE analytics.seo_execution_candidate
         SET approval_status = 'approved', approved_at = NOW()
         WHERE enhancement_id = $1 AND approval_status = 'pending'`,
        [enhancement_id],
      );
    } else {
      await pool.query(
        `UPDATE analytics.seo_page_enhancement
         SET lifecycle_state = 'retired'
         WHERE enhancement_id = $1`,
        [enhancement_id],
      );
      await pool.query(
        `UPDATE analytics.seo_execution_candidate
         SET approval_status = 'rejected', is_active = false
         WHERE enhancement_id = $1 AND approval_status = 'pending'`,
        [enhancement_id],
      );
    }

    return NextResponse.json({ success: true, enhancement_id, action });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/enhancement-queue] POST error:', msg);
    return NextResponse.json({ error: 'Failed to process enhancement action' }, { status: 500 });
  }
}
