/**
 * Activity Database Client — Direct Postgres Access
 * 
 * ============================================================================
 * CANONICAL activity.events SCHEMA CONTRACT
 * ============================================================================
 * 
 * This is the AUTHORITATIVE schema definition for activity.events.
 * All code in this repository MUST honor this contract.
 * 
 * TABLE: activity.events
 * ┌─────────────┬─────────────┬──────────┬─────────────────────────────────┐
 * │ Column      │ Type        │ Nullable │ Default                         │
 * ├─────────────┼─────────────┼──────────┼─────────────────────────────────┤
 * │ id          │ uuid        │ NOT NULL │ none (must be generated)        │
 * │ event_type  │ text        │ NOT NULL │ none                            │
 * │ entity_type │ text        │ NOT NULL │ none                            │
 * │ entity_id   │ uuid        │ NOT NULL │ none                            │
 * │ payload     │ jsonb       │ nullable │ none                            │
 * │ created_at  │ timestamptz │ nullable │ NOW() or handled by DB          │
 * └─────────────┴─────────────┴──────────┴─────────────────────────────────┘
 * 
 * ENTITY TYPE VALUES (for campaign execution):
 * - 'campaign_run' - Events related to campaign execution runs
 * - 'campaign'     - Events related to campaign lifecycle
 * - 'organization' - Events related to sourced organizations
 * - 'contact'      - Events related to discovered contacts
 * - 'lead'         - Events related to promoted leads
 * 
 * WHY entity_type AND entity_id EXIST:
 * These columns enable efficient indexing and querying of events by entity.
 * They are part of the target-state event-sourcing architecture where:
 * - entity_type identifies the aggregate type
 * - entity_id identifies the specific aggregate instance
 * - payload contains event-specific data
 * 
 * This design allows:
 * - Efficient queries: WHERE entity_type = 'campaign_run' AND entity_id = ?
 * - Aggregate reconstruction from event stream
 * - Cross-entity correlation via payload fields (campaignId, runId, etc.)
 * 
 * ============================================================================
 * IMPORTANT NOTES
 * ============================================================================
 * 
 * 1. The id column does NOT have a DEFAULT - we MUST generate it in code
 * 2. entity_type and entity_id are NOT NULL - we MUST always provide them
 * 3. Payload contains additional context (campaignId, runId for correlation)
 * 4. This module is the ONLY way to write to activity.events
 * 5. Supabase/PostgREST does NOT expose the activity schema
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
// Canonical Event Types (Compile-Time Enforcement)
// ============================================================================

/**
 * Valid entity types for activity.events.
 * 
 * These correspond to the aggregate types in our domain model:
 * - campaign_run: A single execution run of a campaign
 * - campaign: The campaign itself (lifecycle events)
 * - organization: A sourced organization
 * - contact: A discovered contact
 * - lead: A promoted lead
 */
export type EntityType = 
  | 'campaign_run'
  | 'campaign'
  | 'organization'
  | 'contact'
  | 'lead';

/**
 * Valid event types for campaign execution.
 * 
 * Run lifecycle:
 * - run.started: Run has been initiated
 * - run.running: Run is actively processing
 * - run.completed: Run finished successfully
 * - run.failed: Run encountered an error
 * 
 * Stage lifecycle:
 * - stage.started: A pipeline stage has begun
 * - stage.completed: A pipeline stage finished
 */
export type RunEventType =
  | 'run.started'
  | 'run.running'
  | 'run.completed'
  | 'run.failed'
  | 'stage.started'
  | 'stage.completed';

/**
 * Canonical activity event structure.
 * 
 * This interface enforces the database schema contract at compile-time.
 * ALL event emissions MUST provide these fields.
 * 
 * SCHEMA CONTRACT:
 * - id: Generated by emitActivityEvent() using crypto.randomUUID()
 * - event_type: Required, describes what happened
 * - entity_type: Required, identifies the aggregate type
 * - entity_id: Required, identifies the specific aggregate instance
 * - payload: Optional additional event data
 */
export interface ActivityEvent {
  /** 
   * The type of event (e.g., 'run.started', 'stage.completed').
   * Maps to event_type column (NOT NULL).
   */
  event_type: string;
  
  /**
   * The type of entity this event relates to.
   * Maps to entity_type column (NOT NULL).
   * 
   * For campaign execution, this is typically 'campaign_run'.
   */
  entity_type: EntityType;
  
  /**
   * The unique identifier of the entity.
   * Maps to entity_id column (NOT NULL, uuid).
   * 
   * For campaign runs, this is the runId.
   * For campaigns, this is the campaignId.
   */
  entity_id: string;
  
  /**
   * Additional event-specific data.
   * Maps to payload column (jsonb, nullable).
   * 
   * Contains contextual information like:
   * - campaignId (for correlation)
   * - runId (for correlation)
   * - stage-specific counts and metadata
   */
  payload: Record<string, unknown>;
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit an activity event to activity.events table.
 * 
 * This is the CANONICAL and ONLY way to write to activity.events.
 * 
 * SCHEMA CONTRACT ENFORCEMENT:
 * - id: Generated here using crypto.randomUUID() (column has no DEFAULT)
 * - event_type: Required (NOT NULL)
 * - entity_type: Required (NOT NULL)  
 * - entity_id: Required (NOT NULL)
 * - payload: Passed through as JSONB
 * - created_at: Handled by database DEFAULT or set here
 * 
 * WHY WE GENERATE id IN CODE:
 * The activity.events.id column does NOT have a DEFAULT value in the database.
 * We MUST generate the UUID explicitly in application code to avoid:
 * "null value in column 'id' of relation 'events' violates not-null constraint"
 * 
 * @param event - The event to emit (must include all NOT NULL fields)
 * @throws Error if database write fails
 */
export async function emitActivityEvent(event: ActivityEvent): Promise<void> {
  const pool = getPool();

  // Generate event ID in application code.
  // IMPORTANT: The id column does NOT have a DEFAULT value.
  // We MUST provide a UUID to avoid NOT NULL constraint violation.
  const eventId = crypto.randomUUID();

  // INSERT statement includes ALL NOT NULL columns:
  // - id: generated above
  // - event_type: from event parameter
  // - entity_type: from event parameter
  // - entity_id: from event parameter
  // - payload: from event parameter
  // - created_at: generated here for consistency
  const query = `
    INSERT INTO activity.events (id, event_type, entity_type, entity_id, payload, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  const values = [
    eventId,
    event.event_type,
    event.entity_type,
    event.entity_id,
    JSON.stringify(event.payload),
    new Date().toISOString(),
  ];

  try {
    await pool.query(query, values);
    console.log(`[activity-db] Emitted event: ${event.event_type} (id: ${eventId}, entity: ${event.entity_type}/${event.entity_id})`);
  } catch (error) {
    console.error(`[activity-db] Failed to emit event ${event.event_type}:`, error);
    throw error;
  }
}

// ============================================================================
// Convenience Helpers for Campaign Run Events
// ============================================================================

/**
 * Emit a campaign run event with standard structure.
 * 
 * This helper ensures consistent event structure for all run-related events.
 * It sets entity_type to 'campaign_run' and entity_id to the runId.
 * 
 * @param eventType - The run event type (run.started, run.completed, etc.)
 * @param runId - The unique run identifier (becomes entity_id)
 * @param campaignId - The campaign this run belongs to (stored in payload)
 * @param additionalPayload - Event-specific data to include in payload
 */
export async function emitRunEvent(
  eventType: RunEventType,
  runId: string,
  campaignId: string,
  additionalPayload: Record<string, unknown> = {}
): Promise<void> {
  await emitActivityEvent({
    event_type: eventType,
    entity_type: 'campaign_run',
    entity_id: runId,
    payload: {
      campaignId,
      runId,
      ...additionalPayload,
    },
  });
}

// ============================================================================
// Event Reading
// ============================================================================

/**
 * Stored event as returned from database queries.
 * Matches the canonical schema.
 */
export interface StoredEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Get the latest run event for a campaign.
 * 
 * Uses entity_type = 'campaign_run' for efficient filtering,
 * then correlates via payload.campaignId.
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

  // Query uses entity_type column for efficient filtering,
  // plus payload->>'campaignId' for campaign correlation
  const query = `
    SELECT id, event_type, entity_type, entity_id, payload, created_at
    FROM activity.events
    WHERE entity_type = 'campaign_run'
      AND payload->>'campaignId' = $1
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
 * @param campaignId - The campaign UUID
 * @param limit - Maximum number of events to return
 * @returns Array of run.started events
 */
export async function getRunStartedEvents(
  campaignId: string,
  limit: number = 50
): Promise<StoredEvent[]> {
  const pool = getPool();

  const query = `
    SELECT id, event_type, entity_type, entity_id, payload, created_at
    FROM activity.events
    WHERE entity_type = 'campaign_run'
      AND payload->>'campaignId' = $1
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

  // Use entity_id (which is the runId) for efficient filtering
  const query = `
    SELECT id, event_type, entity_type, entity_id, payload, created_at
    FROM activity.events
    WHERE entity_type = 'campaign_run'
      AND payload->>'campaignId' = $1
      AND event_type IN ('run.completed', 'run.failed')
      AND entity_id = ANY($2::uuid[])
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
 * @param campaignId - The campaign UUID
 * @param limit - Maximum number of events to return
 * @returns Array of stage.completed events
 */
export async function getStageCompletedEvents(
  campaignId: string,
  limit: number = 10
): Promise<StoredEvent[]> {
  const pool = getPool();

  const query = `
    SELECT id, event_type, entity_type, entity_id, payload, created_at
    FROM activity.events
    WHERE entity_type = 'campaign_run'
      AND payload->>'campaignId' = $1
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
