/**
 * ENM + Real-Time Status Adapter
 * 
 * Provides a clean interface for merging Execution Narrative Machine (ENM) output
 * with real-time execution status data.
 * 
 * DESIGN PRINCIPLES:
 * - ENM remains the NARRATIVE SOURCE (stage copy, keyword messaging, narrative transitions)
 * - Real-Time Status is the DATA AUTHORITY (accurate counts from DB tables)
 * - No logic duplication
 * - No re-interpretation of ENM state
 * 
 * This adapter:
 * 1. Takes ENM narrative as narrative truth
 * 2. Takes RealTimeStatus as data truth  
 * 3. Returns merged view with accurate counts + ENM storytelling
 */

import type { RealTimeExecutionStatus } from './api';
import type { ExecutionNarrative } from './execution-narrative-mapper';

// =============================================================================
// MERGED EXECUTION VIEW
// =============================================================================

/**
 * Merged execution view combining ENM narrative with real-time counts.
 * Use this as the primary data structure for UI components.
 */
export interface MergedExecutionView {
  // --- DATA AUTHORITY (from RealTimeExecutionStatus) ---
  /** Organization counts from public.organizations */
  organizations: {
    total: number;
    qualified: number;
    review: number;
    disqualified: number;
  };
  /** Contact counts from public.campaign_contacts */
  contacts: {
    total: number;
    sourced: number;
    ready: number;
    withEmail: number;
  };
  /** Lead counts from public.leads */
  leads: {
    total: number;
    pending: number;
    approved: number;
  };
  /** Active alerts */
  alerts: Array<{ type: 'info' | 'warning' | 'error'; message: string }>;
  
  // --- NARRATIVE SOURCE (from ENM) ---
  /** Execution mode from ENM */
  mode: ExecutionNarrative['mode'];
  /** Stage narrative copy */
  stageCopy: string;
  /** Stage keywords for UI emphasis */
  keywords: string[];
  /** Human-readable headline */
  headline: string;
  /** Sub-headline with context */
  subheadline: string;
  /** Whether execution is active */
  isActive: boolean;
  /** Whether execution is stalled */
  isStalled: boolean;
  /** Last event timestamp */
  lastEventAt: string | null;
  /** Terminal reason if failed */
  terminalReason: string | null;
  
  // --- RUN METADATA ---
  /** Latest run info */
  run: {
    id: string | null;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    durationSeconds: number | null;
  };
  
  // --- METADATA ---
  /** Which source provided the data */
  _dataSource: {
    counts: 'realtime' | 'enm' | 'fallback';
    narrative: 'enm' | 'realtime' | 'fallback';
    fetchedAt: string;
  };
}

// =============================================================================
// ADAPTER FUNCTION
// =============================================================================

/**
 * Merge ENM narrative with real-time execution status.
 * 
 * The merged view provides:
 * - Accurate counts from RealTimeStatus (DATA AUTHORITY)
 * - Narrative copy from ENM (NARRATIVE SOURCE)
 * - Combined view for UI components
 * 
 * @param enm - Execution Narrative Machine output (narrative source)
 * @param realTimeStatus - Real-time status from DB tables (data authority)
 * @returns MergedExecutionView with accurate counts + ENM storytelling
 */
export function mergeENMWithRealTimeStatus(
  enm: ExecutionNarrative | null,
  realTimeStatus: RealTimeExecutionStatus | null
): MergedExecutionView {
  const now = new Date().toISOString();

  // Handle null inputs gracefully
  if (!enm && !realTimeStatus) {
    return createFallbackView(now);
  }

  // Extract counts from real-time status (DATA AUTHORITY)
  const counts = realTimeStatus?.funnel ?? {
    organizations: { total: 0, qualified: 0, review: 0, disqualified: 0 },
    contacts: { total: 0, sourced: 0, ready: 0, withEmail: 0 },
    leads: { total: 0, pending: 0, approved: 0 },
  };

  // Extract run info - prefer real-time, fallback to ENM
  const runFromRealTime = realTimeStatus?.latestRun;
  const runFromENM = enm?.lastEventAt ? {
    id: null as string | null,
    status: enm.mode === 'terminal' 
      ? (enm.terminal?.status === 'completed' ? 'completed' : 'failed')
      : enm.mode,
    startedAt: enm.lastEventAt,
    completedAt: enm.mode === 'terminal' ? enm.terminal?.completedAt : null,
  } : null;

  const run = {
    id: runFromRealTime?.id ?? runFromENM?.id ?? null,
    status: runFromRealTime?.status ?? runFromENM?.status ?? 'idle',
    startedAt: runFromRealTime?.startedAt ?? runFromENM?.startedAt ?? null,
    completedAt: runFromRealTime?.completedAt ?? runFromENM?.completedAt ?? null,
    durationSeconds: runFromRealTime?.durationSeconds ?? null,
  };

  // Extract narrative elements from ENM (NARRATIVE SOURCE)
  const narrative = {
    mode: enm?.mode ?? deriveModeFallback(realTimeStatus),
    stageCopy: enm?.stage?.name ?? deriveStageCopyFallback(realTimeStatus),
    keywords: enm?.keywordContext?.keywordsWithResults ?? [],
    headline: enm?.headline ?? deriveHeadlineFallback(realTimeStatus),
    subheadline: enm?.subheadline ?? '',
    isActive: enm ? isActiveMode(enm.mode) : isActiveMode(run.status),
    isStalled: enm?.isStalled ?? false,
    lastEventAt: enm?.lastEventAt ?? realTimeStatus?._meta?.fetchedAt ?? null,
    terminalReason: enm?.terminal?.reason ?? 
                    realTimeStatus?.latestRun?.terminationReason ?? 
                    realTimeStatus?.latestRun?.errorMessage ?? 
                    null,
  };

  // Merge alerts from real-time status
  const alerts = realTimeStatus?.alerts ?? [];

  return {
    // DATA AUTHORITY
    organizations: counts.organizations,
    contacts: counts.contacts,
    leads: counts.leads,
    alerts,
    
    // NARRATIVE SOURCE
    mode: narrative.mode,
    stageCopy: narrative.stageCopy,
    keywords: narrative.keywords,
    headline: narrative.headline,
    subheadline: narrative.subheadline,
    isActive: narrative.isActive,
    isStalled: narrative.isStalled,
    lastEventAt: narrative.lastEventAt,
    terminalReason: narrative.terminalReason,
    
    // RUN METADATA
    run,
    
    // METADATA
    _dataSource: {
      counts: realTimeStatus ? 'realtime' : 'fallback',
      narrative: enm ? 'enm' : 'fallback',
      fetchedAt: now,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create fallback view when no data is available.
 */
function createFallbackView(timestamp: string): MergedExecutionView {
  return {
    organizations: { total: 0, qualified: 0, review: 0, disqualified: 0 },
    contacts: { total: 0, sourced: 0, ready: 0, withEmail: 0 },
    leads: { total: 0, pending: 0, approved: 0 },
    alerts: [],
    mode: 'idle',
    stageCopy: '',
    keywords: [],
    headline: 'No execution data',
    subheadline: 'Run the campaign to begin.',
    isActive: false,
    isStalled: false,
    lastEventAt: null,
    terminalReason: null,
    run: {
      id: null,
      status: 'idle',
      startedAt: null,
      completedAt: null,
      durationSeconds: null,
    },
    _dataSource: {
      counts: 'fallback',
      narrative: 'fallback',
      fetchedAt: timestamp,
    },
  };
}

/**
 * Derive execution mode from real-time status when ENM is unavailable.
 */
function deriveModeFallback(realTimeStatus: RealTimeExecutionStatus | null): ExecutionNarrative['mode'] {
  if (!realTimeStatus?.latestRun) return 'idle';
  
  const status = realTimeStatus.latestRun.status?.toLowerCase();
  switch (status) {
    case 'running':
    case 'in_progress':
      return 'running';
    case 'queued':
    case 'run_requested':
      return 'queued';
    case 'completed':
    case 'failed':
      return 'terminal';
    default:
      return 'idle';
  }
}

/**
 * Derive stage copy fallback from real-time status.
 */
function deriveStageCopyFallback(realTimeStatus: RealTimeExecutionStatus | null): string {
  if (!realTimeStatus?.latestRun) return '';
  
  const stage = realTimeStatus.latestRun.stage;
  if (!stage) return '';
  
  return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Derive headline fallback from real-time status.
 */
function deriveHeadlineFallback(realTimeStatus: RealTimeExecutionStatus | null): string {
  if (!realTimeStatus?.latestRun) return 'No recent execution';
  
  const status = realTimeStatus.latestRun.status?.toLowerCase();
  switch (status) {
    case 'running':
    case 'in_progress':
      return 'Execution in progress';
    case 'queued':
    case 'run_requested':
      return 'Execution queued';
    case 'completed':
      return 'Execution completed';
    case 'failed':
      return 'Execution failed';
    default:
      return 'Execution idle';
  }
}

/**
 * Check if mode indicates active execution.
 */
function isActiveMode(mode: string): boolean {
  return ['running', 'queued', 'run_requested', 'in_progress'].includes(mode.toLowerCase());
}

// =============================================================================
// UTILITY FUNCTIONS FOR COMPONENTS
// =============================================================================

/**
 * Check if merged view indicates active execution.
 */
export function isMergedViewActive(view: MergedExecutionView): boolean {
  return view.isActive && !view.isStalled;
}

/**
 * Check if merged view indicates terminal state.
 */
export function isMergedViewTerminal(view: MergedExecutionView): boolean {
  return view.mode === 'terminal';
}

/**
 * Check if merged view indicates failed execution.
 */
export function isMergedViewFailed(view: MergedExecutionView): boolean {
  return view.mode === 'terminal' && view.run.status === 'failed';
}

/**
 * Get total processed items from merged view.
 */
export function getMergedViewTotalProcessed(view: MergedExecutionView): number {
  return view.organizations.total + view.contacts.total + view.leads.total;
}

export default mergeENMWithRealTimeStatus;
