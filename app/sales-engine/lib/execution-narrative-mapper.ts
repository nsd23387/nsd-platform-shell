/**
 * Execution Narrative Mapper (ENM)
 * 
 * GOVERNANCE LOCK: This file implements truthful, event-driven execution storytelling.
 * DO NOT infer state from partial data, counts, timers, or heuristics.
 * 
 * The ENM projects execution truth from campaign_runs + activity.events ONLY.
 * 
 * AUTHORITATIVE INPUTS (MANDATORY):
 * 1. campaign_runs (authoritative state):
 *    - id, status, started_at, completed_at, failure_reason, termination_reason, execution_mode
 * 2. activity.events (observability spine):
 *    - Filter to: run.started, run.completed, stage.boundary, run.failure.context
 * 
 * HARD CONSTRAINTS:
 * - READ-ONLY: No backend changes
 * - NO INFERENCE: Only use explicit signals from campaign_runs + events
 * - OBSERVATION-BASED: State what we observe, not what we infer
 * - DETERMINISTIC: Same inputs always produce same outputs
 * 
 * 🚫 DO NOT infer state from:
 * - Funnel counts alone
 * - Missing events
 * - Local timers
 * - UI heuristics
 */

import { RUN_STALE_THRESHOLD_MS } from './resolveActiveRun';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Campaign run structure from campaign_runs table.
 * This is the AUTHORITATIVE source of execution state.
 */
export interface CampaignRunForENM {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  failure_reason?: string | null;
  termination_reason?: string | null;
  execution_mode?: string;
}

/**
 * Activity event from ODS observability.
 * 
 * ENM only consumes these event_types:
 * - run.started: Execution has begun
 * - run.completed: Execution has finished
 * - stage.boundary: Stage transition (start/complete)
 * - run.failure.context: Failure details
 */
export interface ActivityEventForENM {
  id: string;
  event_type: string;
  run_id?: string;
  campaign_id: string;
  occurred_at: string;
  outcome?: 'success' | 'blocked' | 'skipped' | 'failed' | 'partial';
  reason?: string;
  details?: {
    stage?: string;
    transition?: 'start' | 'complete';
    orgsFound?: number;
    contactsFound?: number;
    leadsPromoted?: number;
    count?: number;
    message?: string;
    [key: string]: unknown;
  };
}

/**
 * Stage status within the execution narrative.
 */
export interface NarrativeStage {
  name: string;
  status: 'pending' | 'active' | 'completed';
  details?: Record<string, unknown>;
}

/**
 * Terminal state information.
 */
export interface TerminalState {
  status: 'completed' | 'failed' | 'skipped';
  reason?: string;
  completedAt: string;
}

/**
 * Keyword context for org sourcing observability.
 * 
 * Derived from:
 * - org_sourcing:keyword_summary
 * - org_sourcing:keyword_health
 * - run.warning (keyword_coverage_low)
 */
export interface KeywordContext {
  /** Total keywords being searched */
  totalKeywords?: number;
  /** Keywords that returned results */
  keywordsWithResults?: string[];
  /** Keywords that returned zero results */
  keywordsWithZeroResults?: string[];
  /** Whether there's a keyword coverage warning */
  hasLowCoverageWarning?: boolean;
  /** Warning message if present */
  warningMessage?: string;
}

/**
 * ExecutionNarrative - The canonical output of the ENM.
 * 
 * This is the ONLY structure UI components should consume for execution state.
 * All execution-related messaging must derive from this structure.
 */
export interface ExecutionNarrative {
  /** Execution mode: idle, queued, running, or terminal */
  mode: 'idle' | 'queued' | 'running' | 'terminal';
  /** Primary headline for display */
  headline: string;
  /** Optional subheadline with additional context */
  subheadline?: string;
  /** Current or most recent stage (if applicable) */
  stage?: NarrativeStage;
  /** Timestamp of the last observed event */
  lastEventAt?: string;
  /** Terminal state details (only present when mode === 'terminal') */
  terminal?: TerminalState;
  /** Trust note for user context */
  trustNote?: string;
  /** Whether this is a stalled execution (special running state) */
  isStalled?: boolean;
  /** Keyword context for org sourcing stage (when applicable) */
  keywordContext?: KeywordContext;
  /** Raw status from campaign_runs for debugging */
  _rawStatus?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize status string to lowercase for comparison.
 */
function normalizeStatus(status?: string | null): string {
  return (status || '').toLowerCase().trim();
}

/**
 * Check if a run is stale (running > 30 minutes AND no recent stage.boundary).
 * 
 * STALLED requires BOTH conditions:
 * 1. status = running AND now − started_at > 30 min
 * 2. No recent stage.boundary events within the threshold
 */
function isRunStaleWithEvents(run: CampaignRunForENM, events: ActivityEventForENM[]): boolean {
  const status = normalizeStatus(run.status);
  if (status !== 'running' && status !== 'in_progress') {
    return false;
  }
  
  const startedAt = run.started_at || run.created_at;
  if (!startedAt) {
    return false;
  }
  
  const startedAtTime = new Date(startedAt).getTime();
  const now = Date.now();
  const runAge = now - startedAtTime;
  
  if (runAge <= RUN_STALE_THRESHOLD_MS) {
    return false;
  }
  
  const stageBoundaryEvents = events.filter(e => 
    e.event_type === 'stage.boundary' && e.run_id === run.id
  );
  
  if (stageBoundaryEvents.length === 0) {
    return true;
  }
  
  const mostRecentStageBoundary = stageBoundaryEvents.reduce((latest, event) => {
    if (!latest) return event;
    return new Date(event.occurred_at) > new Date(latest.occurred_at) ? event : latest;
  }, stageBoundaryEvents[0]);
  
  const lastStageEventTime = new Date(mostRecentStageBoundary.occurred_at).getTime();
  const timeSinceLastStage = now - lastStageEventTime;
  
  return timeSinceLastStage > RUN_STALE_THRESHOLD_MS;
}

/**
 * Find the most recent event by occurred_at.
 */
function getMostRecentEvent(events: ActivityEventForENM[]): ActivityEventForENM | null {
  if (events.length === 0) return null;
  
  return events.reduce((latest, event) => {
    if (!latest) return event;
    return new Date(event.occurred_at) > new Date(latest.occurred_at) ? event : latest;
  }, events[0]);
}

/**
 * Filter events to ENM-relevant types only.
 */
function filterENMEvents(events: ActivityEventForENM[]): ActivityEventForENM[] {
  const ENM_EVENT_TYPES = [
    'run.started',
    'run.completed',
    'stage.boundary',
    'run.failure.context',
    'campaign.run.started',
    'campaign.run.completed',
    'campaign.run.failed',
    'org_sourcing:keyword_summary',
    'org_sourcing:keyword_health',
    'run.warning',
  ];
  
  return events.filter(e => ENM_EVENT_TYPES.includes(e.event_type));
}

/**
 * Extract keyword context from events during org sourcing.
 * 
 * Parses:
 * - org_sourcing:keyword_summary: Total keywords and summary
 * - org_sourcing:keyword_health: Keywords with/without results
 * - run.warning (reason=keyword_coverage_low): Low coverage warning
 */
function extractKeywordContext(events: ActivityEventForENM[]): KeywordContext | undefined {
  const keywordSummary = events.find(e => e.event_type === 'org_sourcing:keyword_summary');
  const keywordHealth = events.find(e => e.event_type === 'org_sourcing:keyword_health');
  const keywordWarning = events.find(
    e => e.event_type === 'run.warning' && e.reason === 'keyword_coverage_low'
  );
  
  if (!keywordSummary && !keywordHealth && !keywordWarning) {
    return undefined;
  }
  
  const context: KeywordContext = {};
  
  if (keywordSummary?.details) {
    const details = keywordSummary.details;
    if (typeof details.totalKeywords === 'number') {
      context.totalKeywords = details.totalKeywords;
    }
  }
  
  if (keywordHealth?.details) {
    const details = keywordHealth.details;
    if (Array.isArray(details.keywordsWithResults)) {
      context.keywordsWithResults = details.keywordsWithResults as string[];
    }
    if (Array.isArray(details.keywordsWithZeroResults)) {
      context.keywordsWithZeroResults = details.keywordsWithZeroResults as string[];
    }
  }
  
  if (keywordWarning) {
    context.hasLowCoverageWarning = true;
    context.warningMessage = keywordWarning.details?.message as string || 
      'Some campaign keywords produced no results. This can happen due to market density or keyword specificity.';
  }
  
  return Object.keys(context).length > 0 ? context : undefined;
}

/**
 * Get the active stage from stage.boundary events.
 * Active stage = most recent stage.boundary:start without a later complete.
 */
function getActiveStage(events: ActivityEventForENM[]): NarrativeStage | null {
  const stageBoundaryEvents = events
    .filter(e => e.event_type === 'stage.boundary')
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  
  if (stageBoundaryEvents.length === 0) return null;
  
  const stageStates: Record<string, 'started' | 'completed'> = {};
  
  for (const event of stageBoundaryEvents) {
    const stageName = event.details?.stage;
    if (!stageName) continue;
    
    if (!stageStates[stageName]) {
      stageStates[stageName] = event.details?.transition === 'complete' ? 'completed' : 'started';
    }
  }
  
  for (const [stageName, state] of Object.entries(stageStates)) {
    if (state === 'started') {
      const stageEvent = stageBoundaryEvents.find(
        e => e.details?.stage === stageName && e.details?.transition !== 'complete'
      );
      
      return {
        name: formatStageName(stageName),
        status: 'active',
        details: stageEvent?.details ? extractStageDetails(stageEvent.details) : undefined,
      };
    }
  }
  
  const mostRecentComplete = stageBoundaryEvents.find(e => e.details?.transition === 'complete');
  if (mostRecentComplete) {
    return {
      name: formatStageName(mostRecentComplete.details?.stage || 'Unknown'),
      status: 'completed',
      details: extractStageDetails(mostRecentComplete.details || {}),
    };
  }
  
  return null;
}

/**
 * Format stage name for display.
 */
function formatStageName(stageId: string): string {
  const stageNames: Record<string, string> = {
    org_sourcing: 'Organization Sourcing',
    contact_discovery: 'Contact Discovery',
    lead_creation: 'Lead Promotion',
    email_readiness: 'Email Readiness',
    personalization: 'Personalization',
    outbound_activation: 'Outbound Activation',
    send_in_progress: 'Sending',
    send_completed: 'Completed',
  };
  
  return stageNames[stageId] || stageId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Extract relevant details for stage display.
 */
function extractStageDetails(details: Record<string, unknown>): Record<string, unknown> {
  const relevant: Record<string, unknown> = {};
  
  if (details.orgsFound !== undefined) {
    relevant.organizationsDiscovered = details.orgsFound;
  }
  if (details.contactsFound !== undefined) {
    relevant.contactsDiscovered = details.contactsFound;
  }
  if (details.leadsPromoted !== undefined) {
    relevant.leadsPromoted = details.leadsPromoted;
  }
  if (details.count !== undefined) {
    relevant.count = details.count;
  }
  if (details.message !== undefined) {
    relevant.message = details.message;
  }
  
  return Object.keys(relevant).length > 0 ? relevant : {};
}

/**
 * Check if run.started event exists for a given run.
 */
function hasRunStartedEvent(events: ActivityEventForENM[], runId: string): boolean {
  return events.some(
    e => (e.event_type === 'run.started' || e.event_type === 'campaign.run.started') && 
         e.run_id === runId
  );
}

/**
 * Check if execution completed with zero results.
 * ONLY if org_sourcing:complete AND orgsFound = 0.
 */
function isCompletedWithZeroResults(events: ActivityEventForENM[]): boolean {
  const orgSourcingComplete = events.find(
    e => e.event_type === 'stage.boundary' && 
         e.details?.stage === 'org_sourcing' && 
         e.details?.transition === 'complete'
  );
  
  return orgSourcingComplete?.details?.orgsFound === 0;
}

/**
 * Get failure context from run.failure.context event.
 */
function getFailureContext(events: ActivityEventForENM[]): string | null {
  const failureEvent = events.find(e => e.event_type === 'run.failure.context');
  return failureEvent?.details?.message as string || failureEvent?.reason || null;
}

/**
 * Get the latest run by created_at.
 */
function getLatestRun(runs: CampaignRunForENM[]): CampaignRunForENM | null {
  if (runs.length === 0) return null;
  
  return runs.reduce((latest, run) => {
    if (!latest) return run;
    const latestTime = new Date(latest.created_at || latest.started_at || 0).getTime();
    const runTime = new Date(run.created_at || run.started_at || 0).getTime();
    return runTime > latestTime ? run : latest;
  }, runs[0]);
}

// =============================================================================
// MAIN MAPPER FUNCTION
// =============================================================================

/**
 * mapExecutionNarrative - The canonical ENM function.
 * 
 * Transforms campaign_runs + activity.events into a truthful ExecutionNarrative.
 * 
 * CANONICAL MAPPING RULES (Must Implement Exactly):
 * 
 * IDLE:
 *   Condition: No campaign_runs exist
 *   Mode: idle
 *   Headline: No execution has run yet
 * 
 * QUEUED:
 *   Condition: Latest run status = queued, No run.started event exists
 *   Mode: queued
 *   Headline: Execution queued
 *   Subheadline: The system will begin processing shortly.
 * 
 * RUNNING:
 *   Condition: run.started exists, No terminal state
 *   Mode: running
 *   Headline: Execution in progress
 *   Subheadline: Processing campaign stages.
 *   Stage: Active stage from stage.boundary events
 * 
 * STALLED (Special Running State):
 *   Condition: status = running, now − started_at > 30 min, no recent stage.boundary
 *   Mode: running (with isStalled = true)
 *   Headline: Execution stalled
 *   Subheadline: The system will automatically mark this execution failed if it does not progress.
 * 
 * COMPLETED:
 *   Condition: run.completed exists, status = completed
 *   With results: Headline: Execution completed successfully
 *   With zero results (org_sourcing:complete AND orgsFound = 0):
 *     Headline: Execution completed — no matching organizations
 *     Subheadline: No organizations matched the current ICP criteria.
 * 
 * FAILED:
 *   Condition: status = failed
 *   Headline: Execution failed
 *   Subheadline: The last execution did not complete successfully.
 * 
 * @param runs - Campaign runs from campaign_runs table
 * @param events - Activity events from ODS
 * @returns ExecutionNarrative - The canonical narrative
 */
export function mapExecutionNarrative(
  runs: CampaignRunForENM[],
  events: ActivityEventForENM[]
): ExecutionNarrative {
  const latestRun = getLatestRun(runs);
  const filteredEvents = filterENMEvents(events);
  const mostRecentEvent = getMostRecentEvent(filteredEvents);
  
  // =====================================================================
  // CASE 1: IDLE - No campaign_runs exist
  // =====================================================================
  if (!latestRun || runs.length === 0) {
    return {
      mode: 'idle',
      headline: 'No execution has run yet',
      trustNote: 'This campaign has not been executed.',
      _rawStatus: undefined,
    };
  }
  
  const status = normalizeStatus(latestRun.status);
  const runEvents = filteredEvents.filter(e => e.run_id === latestRun.id);
  const hasStarted = hasRunStartedEvent(filteredEvents, latestRun.id);
  
  // =====================================================================
  // CASE 2: QUEUED - Latest run status = queued, No run.started event
  // =====================================================================
  if ((status === 'queued' || status === 'run_requested' || status === 'pending') && !hasStarted) {
    return {
      mode: 'queued',
      headline: 'Execution queued',
      subheadline: 'The system will begin processing shortly.',
      lastEventAt: mostRecentEvent?.occurred_at,
      trustNote: 'Execution has been requested and is awaiting worker pickup.',
      _rawStatus: latestRun.status,
    };
  }
  
  // =====================================================================
  // CASE 3: RUNNING or STALLED
  // =====================================================================
  if (status === 'running' || status === 'in_progress' || (hasStarted && !isTerminalStatus(status))) {
    const stale = isRunStaleWithEvents(latestRun, runEvents);
    const activeStage = getActiveStage(runEvents);
    const keywordContext = extractKeywordContext(runEvents);
    
    // STALLED: Running > 30 minutes without recent stage.boundary
    if (stale) {
      return {
        mode: 'running',
        headline: 'Execution stalled',
        subheadline: 'The system will automatically mark this execution failed if it does not progress.',
        stage: activeStage || undefined,
        lastEventAt: mostRecentEvent?.occurred_at,
        isStalled: true,
        keywordContext,
        trustNote: 'This execution has exceeded the 30-minute threshold without completing.',
        _rawStatus: latestRun.status,
      };
    }
    
    // RUNNING: Active execution in progress
    // HARD UI RULE: NEVER show "No organizations found" or "0 organizations" while running
    const stageDetails = activeStage?.details;
    let runningSubheadline = 'Processing campaign stages.';
    
    // Keyword-aware subheadline for org_sourcing stage
    const isOrgSourcing = activeStage?.name?.toLowerCase().includes('organization sourcing') ||
                          activeStage?.name?.toLowerCase() === 'org_sourcing';
    
    if (isOrgSourcing && keywordContext?.totalKeywords && keywordContext.totalKeywords > 1) {
      runningSubheadline = 'Searching organizations using multiple keywords';
    } else if (activeStage && stageDetails) {
      const orgs = stageDetails.organizationsDiscovered;
      // Only show org count if > 0 - never show "0 organizations" while running
      if (typeof orgs === 'number' && orgs > 0) {
        runningSubheadline = `Apollo search completed — ${orgs} organizations discovered`;
      } else if (activeStage.status === 'active') {
        runningSubheadline = `${activeStage.name} in progress...`;
      }
    }
    
    return {
      mode: 'running',
      headline: 'Execution in progress',
      subheadline: runningSubheadline,
      stage: activeStage || undefined,
      lastEventAt: mostRecentEvent?.occurred_at,
      isStalled: false,
      keywordContext,
      trustNote: 'Counts update as stages complete. Some results may not be visible yet.',
      _rawStatus: latestRun.status,
    };
  }
  
  // =====================================================================
  // CASE 4: FAILED - status = failed
  // =====================================================================
  if (status === 'failed' || status === 'error') {
    const failureContext = getFailureContext(runEvents);
    const failureReason = latestRun.failure_reason || latestRun.termination_reason || failureContext;
    
    return {
      mode: 'terminal',
      headline: 'Execution failed',
      subheadline: failureReason || 'The last execution did not complete successfully.',
      lastEventAt: mostRecentEvent?.occurred_at,
      terminal: {
        status: 'failed',
        reason: failureReason || undefined,
        completedAt: latestRun.completed_at || latestRun.updated_at || mostRecentEvent?.occurred_at || '',
      },
      trustNote: 'The system is idle. You are viewing historical execution data.',
      _rawStatus: latestRun.status,
    };
  }
  
  // =====================================================================
  // CASE 5: COMPLETED - status = completed
  // =====================================================================
  if (status === 'completed' || status === 'success' || status === 'succeeded') {
    const zeroResults = isCompletedWithZeroResults(runEvents);
    const keywordContext = extractKeywordContext(runEvents);
    
    if (zeroResults) {
      return {
        mode: 'terminal',
        headline: 'Execution completed — no matching organizations',
        subheadline: 'No organizations matched the current ICP criteria.',
        lastEventAt: mostRecentEvent?.occurred_at,
        terminal: {
          status: 'completed',
          completedAt: latestRun.completed_at || latestRun.updated_at || mostRecentEvent?.occurred_at || '',
        },
        keywordContext,
        trustNote: 'The system is idle. You are viewing historical execution data.',
        _rawStatus: latestRun.status,
      };
    }
    
    return {
      mode: 'terminal',
      headline: 'Execution completed successfully',
      lastEventAt: mostRecentEvent?.occurred_at,
      terminal: {
        status: 'completed',
        completedAt: latestRun.completed_at || latestRun.updated_at || mostRecentEvent?.occurred_at || '',
      },
      keywordContext,
      trustNote: 'The system is idle. You are viewing historical execution data.',
      _rawStatus: latestRun.status,
    };
  }
  
  // =====================================================================
  // CASE 6: SKIPPED - status = skipped or partial
  // =====================================================================
  if (status === 'skipped' || status === 'partial' || status === 'partial_success') {
    return {
      mode: 'terminal',
      headline: 'Execution skipped',
      subheadline: 'This execution was skipped or partially completed.',
      lastEventAt: mostRecentEvent?.occurred_at,
      terminal: {
        status: 'skipped',
        completedAt: latestRun.completed_at || latestRun.updated_at || mostRecentEvent?.occurred_at || '',
      },
      trustNote: 'The system is idle. You are viewing historical execution data.',
      _rawStatus: latestRun.status,
    };
  }
  
  // =====================================================================
  // FALLBACK: Unknown status - treat as idle
  // =====================================================================
  return {
    mode: 'idle',
    headline: `Status: ${latestRun.status || 'Unknown'}`,
    lastEventAt: mostRecentEvent?.occurred_at,
    trustNote: 'Unable to determine execution state from available data.',
    _rawStatus: latestRun.status,
  };
}

/**
 * Check if a status is terminal.
 */
function isTerminalStatus(status: string): boolean {
  return ['completed', 'failed', 'skipped', 'partial', 'success', 'succeeded', 'error'].includes(status);
}

// =============================================================================
// NARRATIVE DISPLAY HELPERS
// =============================================================================

/**
 * Get the narrative badge style based on mode.
 */
export function getNarrativeBadgeStyle(narrative: ExecutionNarrative): {
  bg: string;
  text: string;
  border: string;
} {
  if (narrative.isStalled) {
    return { bg: '#FEF3CD', text: '#856404', border: '#FFC107' };
  }
  
  switch (narrative.mode) {
    case 'idle':
      return { bg: '#E9ECEF', text: '#495057', border: '#CED4DA' };
    case 'queued':
      return { bg: '#CCE5FF', text: '#004085', border: '#4DA3FF' };
    case 'running':
      return { bg: '#D4EDDA', text: '#155724', border: '#28A745' };
    case 'terminal':
      if (narrative.terminal?.status === 'failed') {
        return { bg: '#F8D7DA', text: '#721C24', border: '#F5C6CB' };
      }
      if (narrative.terminal?.status === 'completed') {
        return { bg: '#D4EDDA', text: '#155724', border: '#C3E6CB' };
      }
      return { bg: '#FFF3CD', text: '#856404', border: '#FFEEBA' };
    default:
      return { bg: '#E9ECEF', text: '#495057', border: '#CED4DA' };
  }
}

/**
 * Get the narrative icon name based on mode.
 */
export function getNarrativeIcon(narrative: ExecutionNarrative): 'clock' | 'runs' | 'check' | 'warning' | 'info' {
  if (narrative.isStalled) {
    return 'warning';
  }
  
  switch (narrative.mode) {
    case 'idle':
      return 'info';
    case 'queued':
      return 'clock';
    case 'running':
      return 'runs';
    case 'terminal':
      if (narrative.terminal?.status === 'failed') {
        return 'warning';
      }
      return 'check';
    default:
      return 'info';
  }
}

/**
 * Check if the narrative represents an active execution.
 */
export function isActiveExecution(narrative: ExecutionNarrative): boolean {
  return narrative.mode === 'queued' || (narrative.mode === 'running' && !narrative.isStalled);
}

/**
 * Format the stage details for display.
 */
export function formatStageDetails(stage: NarrativeStage | undefined): string {
  if (!stage) return '';
  
  const parts: string[] = [];
  
  if (stage.status === 'active') {
    parts.push(`${stage.name} in progress`);
  } else if (stage.status === 'completed') {
    parts.push(`${stage.name} completed`);
  }
  
  if (stage.details) {
    const details = stage.details;
    if (typeof details.organizationsDiscovered === 'number') {
      parts.push(`${details.organizationsDiscovered} organizations`);
    }
    if (typeof details.contactsDiscovered === 'number') {
      parts.push(`${details.contactsDiscovered} contacts`);
    }
    if (typeof details.leadsPromoted === 'number') {
      parts.push(`${details.leadsPromoted} leads`);
    }
  }
  
  return parts.join(' — ');
}
