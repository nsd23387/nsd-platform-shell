/**
 * Activity Database Client — Direct Postgres Access
 * 
 * IMPORTANT:
 * activity.events is written via direct DB connection, not PostgREST.
 * 
 * The activity schema is NOT exposed via Supabase/PostgREST.
 * All writes and reads to activity.events MUST use this module,
 * which connects directly to Postgres via DATABASE_URL.
 * 
 * NOTE: activity.events is event-sourced.
 * Identifiers such as campaignId and runId live in payload (JSONB),
 * not as physical columns.
 * 
 * SCHEMA (activity.events):
 * - id: uuid (auto-generated)
 * - event_type: text (e.g., 'run.started', 'run.completed')
 * - payload: jsonb (contains campaignId, runId, and all event data)
 * - created_at: timestamptz (auto-generated)
 * 
 * There are NO physical columns for campaign_id, run_id, entity_type, entity_id, etc.
 * ALL contextual identifiers live inside payload.
 * 
 * ARCHITECTURE:
 * - Supabase client is used for core.* schema (campaigns, organizations, etc.)
 * - This module is used for activity.* schema (events)
 * - This separation is intentional and target-state compliant
 * 
 * GOVERNANCE:
 * - Append-only writes only
 * - No updates or deletes
 * - All event writes go through emitActivityEvent()
 */

import { Pool } from 'pg';

// ============================================================================
// Connection Pool
// ============================================================================

let pool: Pool | null = null;

/**
 * Get or create the connection pool for activity schema access.
 * Uses DATABASE_URL with SSL for secure connections.
 */
function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured. Required for activity.events writes.');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false, // Required for Supabase/cloud Postgres
      },
      max: 5, // Small pool for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Log connection errors
    pool.on('error', (err) => {
      console.error('[activity-db] Pool error:', err);
    });
  }

  return pool;
}

/**
 * Check if the activity database is configured.
 */
export function isActivityDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// ============================================================================
// Event Types
// ============================================================================

export interface ActivityEvent {
  event_type: string;
  payload: Record<string, unknown>;
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit an activity event to activity.events table.
 * 
 * Uses direct Postgres connection (not PostgREST/Supabase client).
 * This is the ONLY way to write to activity.events.
 * 
 * NOTE: activity.events is event-sourced.
 * Identifiers such as campaignId and runId live in payload (JSONB),
 * not as physical columns.
 * 
 * NOTE: The id column does NOT have a DEFAULT value in the database,
 * so we must generate it explicitly in application code using crypto.randomUUID().
 * 
 * @param event - The event to emit (event_type + payload only)
 */
export async function emitActivityEvent(event: ActivityEvent): Promise<void> {
  const pool = getPool();

  // NOTE: activity.events is event-sourced.
  // Identifiers such as campaignId and runId live in payload (JSONB),
  // not as physical columns.
  //
  // IMPORTANT: The id column does NOT have a DEFAULT value.
  // We must generate the UUID explicitly in application code.
  const eventId = crypto.randomUUID();

  const query = `
    INSERT INTO activity.events (id, event_type, payload)
    VALUES ($1, $2, $3)
  `;

  const values = [
    eventId,
    event.event_type,
    JSON.stringify(event.payload),
  ];

  try {
    await pool.query(query, values);
    console.log(`[activity-db] Emitted event: ${event.event_type} (id: ${eventId})`);
  } catch (error) {
    console.error(`[activity-db] Failed to emit event ${event.event_type}:`, error);
    throw error;
  }
}

// ============================================================================
// Event Reading
// ============================================================================

export interface StoredEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Get the latest run event for a campaign.
 * 
 * Uses direct Postgres connection to read from activity.events.
 * 
 * NOTE: activity.events is event-sourced.
 * Identifiers such as campaignId and runId live in payload (JSONB),
 * not as physical columns.
 * 
 * @param campaignId - The campaign UUID
 * @param eventTypes - Array of event types to filter by
 * @returns The latest event or null
 */
export async function getLatestRunEvent(
  campaignId: string,
  eventTypes: string[]
): Promise<StoredEvent | null> {
  const pool = getPool();

  // NOTE: activity.events is event-sourced.
  // Identifiers such as campaignId and runId live in payload (JSONB),
  // not as physical columns.
  const query = `
    SELECT id, event_type, payload, created_at
    FROM activity.events
    WHERE payload->>'campaignId' = $1
      AND event_type = ANY($2)
    ORDER BY created_at DESC
    LIMIT 1
  `;

  try {
    const result = await pool.query(query, [campaignId, eventTypes]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0] as StoredEvent;
  } catch (error) {
    console.error(`[activity-db] Failed to get latest run event:`, error);
    throw error;
  }
}

/**
 * Get run started events for a campaign.
 * 
 * NOTE: activity.events is event-sourced.
 * Identifiers such as campaignId and runId live in payload (JSONB),
 * not as physical columns.
 * 
 * @param campaignId - The campaign UUID
 * @param limit - Maximum number of events to return
 * @returns Array of run.started events
 */
export async function getRunStartedEvents(
  campaignId: string,
  limit: number = 50
): Promise<StoredEvent[]> {
  const pool = getPool();

  // NOTE: activity.events is event-sourced.
  // Identifiers such as campaignId and runId live in payload (JSONB),
  // not as physical columns.
  const query = `
    SELECT id, event_type, payload, created_at
    FROM activity.events
    WHERE payload->>'campaignId' = $1
      AND event_type = 'run.started'
    ORDER BY created_at DESC
    LIMIT $2
  `;

  try {
    const result = await pool.query(query, [campaignId, limit]);
    return result.rows as StoredEvent[];
  } catch (error) {
    console.error(`[activity-db] Failed to get run started events:`, error);
    throw error;
  }
}

/**
 * Get completion events for specific run IDs.
 * 
 * NOTE: activity.events is event-sourced.
 * Identifiers such as campaignId and runId live in payload (JSONB),
 * not as physical columns.
 * 
 * @param campaignId - The campaign UUID
 * @param runIds - Array of run IDs to check
 * @returns Array of completion/failure events
 */
export async function getCompletionEvents(
  campaignId: string,
  runIds: string[]
): Promise<StoredEvent[]> {
  if (runIds.length === 0) {
    return [];
  }

  const pool = getPool();

  // NOTE: activity.events is event-sourced.
  // Identifiers such as campaignId and runId live in payload (JSONB),
  // not as physical columns.
  const query = `
    SELECT id, event_type, payload, created_at
    FROM activity.events
    WHERE payload->>'campaignId' = $1
      AND event_type IN ('run.completed', 'run.failed')
      AND payload->>'runId' = ANY($2)
  `;

  try {
    const result = await pool.query(query, [campaignId, runIds]);
    return result.rows as StoredEvent[];
  } catch (error) {
    console.error(`[activity-db] Failed to get completion events:`, error);
    throw error;
  }
}

/**
 * Get stage completed events for a campaign.
 * 
 * NOTE: activity.events is event-sourced.
 * Identifiers such as campaignId and runId live in payload (JSONB),
 * not as physical columns.
 * 
 * @param campaignId - The campaign UUID
 * @param limit - Maximum number of events to return
 * @returns Array of stage.completed events
 */
export async function getStageCompletedEvents(
  campaignId: string,
  limit: number = 10
): Promise<StoredEvent[]> {
  const pool = getPool();

  // NOTE: activity.events is event-sourced.
  // Identifiers such as campaignId and runId live in payload (JSONB),
  // not as physical columns.
  const query = `
    SELECT id, event_type, payload, created_at
    FROM activity.events
    WHERE payload->>'campaignId' = $1
      AND event_type = 'stage.completed'
    ORDER BY created_at DESC
    LIMIT $2
  `;

  try {
    const result = await pool.query(query, [campaignId, limit]);
    return result.rows as StoredEvent[];
  } catch (error) {
    console.error(`[activity-db] Failed to get stage completed events:`, error);
    throw error;
  }
}
