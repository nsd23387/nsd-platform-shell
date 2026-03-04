/**
 * Web Event Ingestion Endpoint
 *
 * POST /api/ingest/web-event
 *
 * Accepts web analytics events and writes them to analytics.raw_web_events.
 * When a conversion event includes origin_page, origin_url, or landing_page,
 * the value is normalized to a canonical path and stored in
 * event_data.landing_page so that revenue attribution points to the
 * originating SEO landing page rather than the quote subdomain page_url.
 *
 * GOVERNANCE: This is the only write-path for analytics.raw_web_events
 * in this repository. All other analytics queries are read-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { normalizeLandingPage } from '../../../../lib/normalize-landing-page';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error('No database URL configured');
    pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => {
      console.error('[ingest/web-event] Pool error:', err);
    });
  }
  return pool;
}

interface WebEventPayload {
  event_type: string;
  page_url: string;
  visitor_id: string;
  session_id: string;
  occurred_at?: string;
  event_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  page_title?: string;
  source?: string;

  origin_page?: string;
  origin_url?: string;
  landing_page?: string;
}

function validatePayload(body: unknown): { valid: true; data: WebEventPayload } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  const required = ['event_type', 'page_url', 'visitor_id', 'session_id'] as const;
  for (const field of required) {
    if (typeof b[field] !== 'string' || (b[field] as string).trim() === '') {
      return { valid: false, error: `Missing or empty required field: ${field}` };
    }
  }

  return { valid: true, data: b as unknown as WebEventPayload };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validatePayload(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;

    const resolvedLandingPage = normalizeLandingPage(
      data.origin_page,
      data.origin_url,
      data.landing_page,
    );

    const eventData: Record<string, unknown> = {
      ...(data.event_data ?? {}),
    };
    if (resolvedLandingPage) {
      eventData.landing_page = resolvedLandingPage;
    }

    const occurredAt = data.occurred_at ? new Date(data.occurred_at) : new Date();
    if (isNaN(occurredAt.getTime())) {
      return NextResponse.json({ error: 'Invalid occurred_at timestamp' }, { status: 400 });
    }

    const ingestionRunId = randomUUID();

    const sql = `
      INSERT INTO analytics.raw_web_events (
        source_system, event_name, occurred_at,
        anonymous_session_id, payload, ingestion_run_id,
        event_data, event_type, "timestamp",
        visitor_id, session_id, page_url,
        ip_address, user_agent, referrer,
        page_title, source
      ) VALUES (
        'api-ingest', $1, $2,
        $3, $4::jsonb, $5::uuid,
        $6::jsonb, $7, $8,
        $9, $10, $11,
        $12, $13, $14,
        $15, $16
      )
      RETURNING id
    `;

    const values = [
      data.event_type,
      occurredAt.toISOString(),
      data.session_id,
      JSON.stringify(eventData),
      ingestionRunId,
      JSON.stringify(eventData),
      data.event_type,
      occurredAt.toISOString(),
      data.visitor_id,
      data.session_id,
      data.page_url,
      data.ip_address ?? null,
      data.user_agent ?? null,
      data.referrer ?? null,
      data.page_title ?? null,
      data.source ?? null,
    ];

    const db = getPool();
    const result = await db.query(sql, values);
    const insertedId = result.rows[0]?.id;

    return NextResponse.json(
      {
        id: insertedId,
        landing_page: resolvedLandingPage,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[ingest/web-event] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
