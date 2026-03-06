/**
 * QMS Deal Ingestion Endpoint
 *
 * POST /api/ingest/qms-deal
 *
 * Accepts lifecycle events from the Convex Quote Management System and
 * upserts them into analytics.raw_qms_deals (one row per quote, updated
 * on every status transition).
 *
 * GOVERNANCE: This is the only write-path for analytics.raw_qms_deals
 * in this repository. All other analytics queries are read-only.
 *
 * Auth: Bearer token via Authorization header, validated against SYNC_SECRET.
 * CORS: Allows Convex cloud origins.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const ALLOWED_ORIGINS = [
  'https://neonsignsdepot.com',
  'https://www.neonsignsdepot.com',
  'https://quote.neonsignsdepot.com',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

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
      console.error('[ingest/qms-deal] Pool error:', err);
    });
  }
  return pool;
}

let tableEnsured = false;

async function ensureTable(db: Pool): Promise<void> {
  if (tableEnsured) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS analytics.raw_qms_deals (
      id SERIAL PRIMARY KEY,
      convex_quote_id TEXT UNIQUE NOT NULL,
      quote_number TEXT NOT NULL,
      quote_type TEXT,
      quote_activity TEXT NOT NULL,
      quote_active BOOLEAN DEFAULT true,
      total_price_cents BIGINT DEFAULT 0,
      customer_name TEXT,
      customer_email TEXT,
      customer_company TEXT,
      customer_city TEXT,
      customer_state TEXT,
      sign_text TEXT,
      sign_type TEXT,
      landing_page TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      deposit_paid_at TIMESTAMPTZ,
      quote_paid_at TIMESTAMPTZ,
      cancel_reason TEXT,
      cancel_details TEXT,
      followup_lane TEXT,
      followup_count INT DEFAULT 0,
      followup_last_sent_at TIMESTAMPTZ,
      discount_code TEXT,
      discount_percentage NUMERIC,
      discount_used_at TIMESTAMPTZ,
      revision_round INT DEFAULT 0,
      production_assigned_at TIMESTAMPTZ,
      production_delivered_at TIMESTAMPTZ,
      shipping_carrier TEXT,
      shipping_tracking_number TEXT,
      ingested_at TIMESTAMPTZ DEFAULT NOW(),
      last_event TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_qms_deals_activity ON analytics.raw_qms_deals (quote_activity);
    CREATE INDEX IF NOT EXISTS idx_qms_deals_created ON analytics.raw_qms_deals (created_at);
    CREATE INDEX IF NOT EXISTS idx_qms_deals_email ON analytics.raw_qms_deals (customer_email);
    CREATE INDEX IF NOT EXISTS idx_qms_deals_number ON analytics.raw_qms_deals (quote_number);
    CREATE INDEX IF NOT EXISTS idx_qms_deals_active ON analytics.raw_qms_deals (quote_active) WHERE quote_active = true;
  `);
  tableEnsured = true;
}

interface QMSDealPayload {
  convex_quote_id: string;
  quote_number: string;
  quote_type?: string;
  quote_activity: string;
  quote_active?: boolean;
  total_price_cents?: number;
  customer_name?: string;
  customer_email?: string;
  customer_company?: string;
  customer_city?: string;
  customer_state?: string;
  sign_text?: string;
  sign_type?: string;
  landing_page?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at: string;
  updated_at: string;
  deposit_paid_at?: string | null;
  quote_paid_at?: string | null;
  cancel_reason?: string | null;
  cancel_details?: string | null;
  followup_lane?: string | null;
  followup_count?: number;
  followup_last_sent_at?: string | null;
  discount_code?: string | null;
  discount_percentage?: number | null;
  discount_used_at?: string | null;
  revision_round?: number;
  production_assigned_at?: string | null;
  production_delivered_at?: string | null;
  shipping_carrier?: string | null;
  shipping_tracking_number?: string | null;
  last_event?: string;
}

function validatePayload(body: unknown): { valid: true; data: QMSDealPayload } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  const required = ['convex_quote_id', 'quote_number', 'quote_activity', 'created_at', 'updated_at'] as const;
  for (const field of required) {
    if (typeof b[field] !== 'string' || (b[field] as string).trim() === '') {
      return { valid: false, error: `Missing or empty required field: ${field}` };
    }
  }

  for (const ts of ['created_at', 'updated_at'] as const) {
    const d = new Date(b[ts] as string);
    if (isNaN(d.getTime())) {
      return { valid: false, error: `Invalid timestamp for ${ts}` };
    }
  }

  return { valid: true, data: b as unknown as QMSDealPayload };
}

function tsOrNull(val: string | null | undefined): string | null {
  if (val == null || val === '') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);

  const expectedToken = process.env.SYNC_SECRET;
  if (!expectedToken) {
    return NextResponse.json({ error: 'SYNC_SECRET not configured on server' }, { status: 500, headers: cors });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const body = await request.json();
    const validation = validatePayload(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400, headers: cors });
    }

    const d = validation.data;
    const db = getPool();
    await ensureTable(db);

    const sql = `
      INSERT INTO analytics.raw_qms_deals (
        convex_quote_id, quote_number, quote_type, quote_activity, quote_active,
        total_price_cents, customer_name, customer_email, customer_company,
        customer_city, customer_state, sign_text, sign_type,
        landing_page, referrer, utm_source, utm_medium, utm_campaign,
        created_at, updated_at, deposit_paid_at, quote_paid_at,
        cancel_reason, cancel_details,
        followup_lane, followup_count, followup_last_sent_at,
        discount_code, discount_percentage, discount_used_at,
        revision_round, production_assigned_at, production_delivered_at,
        shipping_carrier, shipping_tracking_number, last_event, ingested_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24,
        $25, $26, $27,
        $28, $29, $30,
        $31, $32, $33,
        $34, $35, $36, NOW()
      )
      ON CONFLICT (convex_quote_id) DO UPDATE SET
        quote_number = EXCLUDED.quote_number,
        quote_type = EXCLUDED.quote_type,
        quote_activity = EXCLUDED.quote_activity,
        quote_active = EXCLUDED.quote_active,
        total_price_cents = EXCLUDED.total_price_cents,
        customer_name = EXCLUDED.customer_name,
        customer_email = EXCLUDED.customer_email,
        customer_company = EXCLUDED.customer_company,
        customer_city = EXCLUDED.customer_city,
        customer_state = EXCLUDED.customer_state,
        sign_text = EXCLUDED.sign_text,
        sign_type = EXCLUDED.sign_type,
        landing_page = COALESCE(NULLIF(EXCLUDED.landing_page, ''), analytics.raw_qms_deals.landing_page),
        referrer = COALESCE(NULLIF(EXCLUDED.referrer, ''), analytics.raw_qms_deals.referrer),
        utm_source = COALESCE(NULLIF(EXCLUDED.utm_source, ''), analytics.raw_qms_deals.utm_source),
        utm_medium = COALESCE(NULLIF(EXCLUDED.utm_medium, ''), analytics.raw_qms_deals.utm_medium),
        utm_campaign = COALESCE(NULLIF(EXCLUDED.utm_campaign, ''), analytics.raw_qms_deals.utm_campaign),
        updated_at = EXCLUDED.updated_at,
        deposit_paid_at = EXCLUDED.deposit_paid_at,
        quote_paid_at = EXCLUDED.quote_paid_at,
        cancel_reason = EXCLUDED.cancel_reason,
        cancel_details = EXCLUDED.cancel_details,
        followup_lane = EXCLUDED.followup_lane,
        followup_count = EXCLUDED.followup_count,
        followup_last_sent_at = EXCLUDED.followup_last_sent_at,
        discount_code = EXCLUDED.discount_code,
        discount_percentage = EXCLUDED.discount_percentage,
        discount_used_at = EXCLUDED.discount_used_at,
        revision_round = EXCLUDED.revision_round,
        production_assigned_at = EXCLUDED.production_assigned_at,
        production_delivered_at = EXCLUDED.production_delivered_at,
        shipping_carrier = EXCLUDED.shipping_carrier,
        shipping_tracking_number = EXCLUDED.shipping_tracking_number,
        last_event = EXCLUDED.last_event,
        ingested_at = NOW()
      RETURNING id, (xmax = 0) AS inserted
    `;

    const values = [
      d.convex_quote_id,
      d.quote_number,
      d.quote_type ?? null,
      d.quote_activity,
      d.quote_active ?? true,
      d.total_price_cents ?? 0,
      d.customer_name ?? null,
      d.customer_email ?? null,
      d.customer_company ?? null,
      d.customer_city ?? null,
      d.customer_state ?? null,
      d.sign_text ?? null,
      d.sign_type ?? null,
      d.landing_page ?? null,
      d.referrer ?? null,
      d.utm_source ?? null,
      d.utm_medium ?? null,
      d.utm_campaign ?? null,
      new Date(d.created_at).toISOString(),
      new Date(d.updated_at).toISOString(),
      tsOrNull(d.deposit_paid_at),
      tsOrNull(d.quote_paid_at),
      d.cancel_reason ?? null,
      d.cancel_details ?? null,
      d.followup_lane ?? null,
      d.followup_count ?? 0,
      tsOrNull(d.followup_last_sent_at),
      d.discount_code ?? null,
      d.discount_percentage ?? null,
      tsOrNull(d.discount_used_at),
      d.revision_round ?? 0,
      tsOrNull(d.production_assigned_at),
      tsOrNull(d.production_delivered_at),
      d.shipping_carrier ?? null,
      d.shipping_tracking_number ?? null,
      d.last_event ?? d.quote_activity,
    ];

    const result = await db.query(sql, values);
    const row = result.rows[0];

    let attributionEnriched = false;
    const hasUtm = d.utm_source && d.utm_source.trim() !== '';
    if (!hasUtm) {
      try {
        const enrichSql = `
          UPDATE analytics.raw_qms_deals AS qms
          SET
            utm_source = COALESCE(NULLIF(we.event_data->>'utm_source', ''), NULLIF(we.payload->>'utm_source', ''), we.source),
            utm_medium = COALESCE(NULLIF(we.event_data->>'utm_medium', ''), we.payload->>'utm_medium'),
            utm_campaign = COALESCE(NULLIF(we.event_data->>'utm_campaign', ''), we.payload->>'utm_campaign'),
            landing_page = COALESCE(NULLIF(we.event_data->>'landing_page', ''), NULLIF(we.payload->>'landing_page', '')),
            referrer = we.referrer
          FROM (
            SELECT payload, source, referrer, event_data
            FROM analytics.raw_web_events
            WHERE event_type = 'conversion'
              AND (
                payload->>'quote_id' = $1
                OR event_data->>'quote_id' = $1
              )
              AND (
                COALESCE(NULLIF(event_data->>'utm_source', ''), NULLIF(payload->>'utm_source', ''), source) IS NOT NULL
                AND COALESCE(NULLIF(event_data->>'utm_source', ''), NULLIF(payload->>'utm_source', ''), source) != ''
              )
            ORDER BY occurred_at DESC
            LIMIT 1
          ) AS we
          WHERE qms.convex_quote_id = $1
            AND (qms.utm_source IS NULL OR qms.utm_source = '')
        `;
        const enrichResult = await db.query(enrichSql, [d.convex_quote_id]);
        attributionEnriched = (enrichResult.rowCount ?? 0) > 0;
        if (attributionEnriched) {
          console.log(`[ingest/qms-deal] Attribution enriched from web-event for: ${d.quote_number}`);
        }
      } catch (enrichErr) {
        console.warn('[ingest/qms-deal] Attribution enrichment failed (non-fatal):', enrichErr);
      }
    }

    return NextResponse.json(
      {
        id: row.id,
        quote_number: d.quote_number,
        action: row.inserted ? 'inserted' : 'updated',
        attribution_enriched: attributionEnriched,
      },
      { status: row.inserted ? 201 : 200, headers: cors },
    );
  } catch (err) {
    console.error('[ingest/qms-deal] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: cors },
    );
  }
}
