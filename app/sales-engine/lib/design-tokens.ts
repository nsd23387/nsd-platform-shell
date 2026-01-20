export const NSD_COLORS = {
  // Brand primary colors from Neon Signs Depot
  primary: '#020F5A',       // Deep Indigo (brand primary)
  secondary: '#692BAA',     // Violet (brand secondary)
  cta: '#CC368F',           // Magenta (call-to-action)
  
  // Extended brand palette (from logo gradient)
  magenta: {
    light: '#FCE7F3',       // Light pink/magenta tint
    base: '#CC368F',        // Primary magenta
    dark: '#912D73',        // Dark magenta
  },
  indigo: {
    light: '#E8EAF6',       // Light indigo tint
    base: '#020F5A',        // Primary indigo
    dark: '#010A3D',        // Darker indigo
  },
  violet: {
    light: '#EDE7F6',       // Light violet tint
    base: '#692BAA',        // Primary violet
    dark: '#4A1D7A',        // Dark violet
  },
  
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceHover: '#F3F4F6',
  
  text: {
    primary: '#020F5A',     // Use brand indigo for primary text
    secondary: '#6B7280',
    muted: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  
  border: {
    light: '#E5E7EB',
    default: '#D1D5DB',
    dark: '#9CA3AF',
  },
  
  /**
   * NSD Brand-aligned status colors
   * NO yellow, green, or red - only magenta, indigo, violet variations
   */
  status: {
    draft: { bg: '#E8EAF6', text: '#020F5A', border: '#C5CAE9' },           // Indigo tint - draft
    pendingReview: { bg: '#FCE7F3', text: '#912D73', border: '#F9A8D4' },   // Magenta tint - needs review
    approvedReady: { bg: '#EDE7F6', text: '#4A1D7A', border: '#CE93D8' },   // Violet tint - ready
    running: { bg: '#E8EAF6', text: '#020F5A', border: '#9FA8DA' },         // Indigo - running
    completed: { bg: '#EDE7F6', text: '#4A1D7A', border: '#CE93D8' },       // Violet - completed
    failed: { bg: '#FCE7F3', text: '#912D73', border: '#F48FB1' },          // Magenta - failed
    archived: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },        // Gray - archived
  },
  
  /**
   * NSD Brand semantic status colors
   * All colors derived from magenta/indigo/violet palette only
   * 
   * Brand palette mapping:
   * - active: Indigo (running processes, active states)
   * - positive: Violet (completed, success states)
   * - attention: Magenta light (needs review, conditional states)
   * - critical: Magenta dark (failures, blocked states)
   * - muted: Neutral gray (idle, pending states)
   * - info: Indigo light (informational)
   */
  semantic: {
    active: { bg: '#E8EAF6', text: '#020F5A', border: '#9FA8DA' },      // Indigo - running/active
    positive: { bg: '#EDE7F6', text: '#4A1D7A', border: '#CE93D8' },    // Violet - completed/success
    attention: { bg: '#FCE7F3', text: '#912D73', border: '#F9A8D4' },   // Magenta light - warning/review
    critical: { bg: '#FCE7F3', text: '#912D73', border: '#F48FB1' },    // Magenta - error/failed
    muted: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' },       // Gray - idle/pending
    info: { bg: '#E8EAF6', text: '#020F5A', border: '#C5CAE9' },        // Indigo light - informational
  },
  
  // Brand-aligned semantic colors (NO green/yellow/red)
  success: '#692BAA',   // Violet for success
  warning: '#CC368F',   // Magenta for warnings
  error: '#912D73',     // Dark magenta for errors
  info: '#020F5A',      // Indigo for info
} as const;

/**
 * Semantic status style mapping for execution states.
 * Returns brand-aligned colors (NO green/yellow/red).
 */
export function getSemanticStatusStyle(status: string): { bg: string; text: string; border: string } {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    // Execution states (aligned with queued → cron execution model)
    idle: NSD_COLORS.semantic.muted,
    queued: NSD_COLORS.semantic.info,           // NEW: Queued - execution starting shortly
    run_requested: NSD_COLORS.semantic.info,    // Legacy: maps to queued
    running: NSD_COLORS.semantic.active,
    awaiting_approvals: NSD_COLORS.semantic.attention,
    completed: NSD_COLORS.semantic.positive,
    failed: NSD_COLORS.semantic.critical,
    partial: NSD_COLORS.semantic.attention,
    blocked: NSD_COLORS.semantic.critical,      // NEW: Blocked state
    
    // Run status
    COMPLETED: NSD_COLORS.semantic.positive,
    FAILED: NSD_COLORS.semantic.critical,
    PARTIAL: NSD_COLORS.semantic.attention,
    RUNNING: NSD_COLORS.semantic.active,
    QUEUED: NSD_COLORS.semantic.info,           // NEW: Queued run status
    BLOCKED: NSD_COLORS.semantic.critical,      // NEW: Blocked run status
    
    // Generic
    success: NSD_COLORS.semantic.positive,
    error: NSD_COLORS.semantic.critical,
    warning: NSD_COLORS.semantic.attention,
    active: NSD_COLORS.semantic.active,
  };
  
  return styles[status] || NSD_COLORS.semantic.muted;
}

/**
 * Execution status labels for UI display.
 * Maps backend state → human-readable UI labels.
 * 
 * IMPORTANT: These labels are the source of truth for execution status copy.
 * All execution status text should use these labels.
 */
export const EXECUTION_STATUS_LABELS: Record<string, string> = {
  // Queued state - user clicked Run, awaiting cron execution
  queued: 'Queued – execution will start shortly',
  run_requested: 'Queued – execution will start shortly',
  
  // Running states with stage context
  running: 'Running – sourcing organizations',
  running_sourcing: 'Running – sourcing organizations',
  running_discovering: 'Running – discovering contacts',
  running_evaluating: 'Running – evaluating contacts',
  running_promoting: 'Running – promoting leads',
  running_sending: 'Running – sending emails',
  
  // Completion states
  completed: 'Completed – results available',
  awaiting_approvals: 'Completed – awaiting lead approvals',
  
  // Failure states
  failed: 'Failed – see timeline for details',
  partial: 'Partially completed – see timeline for details',
  
  // Blocked state
  blocked: 'Blocked – see reason',
  
  // Idle state
  idle: 'Ready for execution',
};

/**
 * Get execution status label for display.
 * 
 * @param status - Execution status from backend
 * @param currentStage - Optional current pipeline stage
 * @returns Human-readable status label
 */
export function getExecutionStatusLabel(status: string, currentStage?: string): string {
  // For running status, include stage context if available
  if (status === 'running' && currentStage) {
    const stageKey = `running_${currentStage.replace(/_/g, '').toLowerCase()}`;
    if (EXECUTION_STATUS_LABELS[stageKey]) {
      return EXECUTION_STATUS_LABELS[stageKey];
    }
    // Fallback with formatted stage name
    return `Running – ${formatStageName(currentStage)}`;
  }
  
  return EXECUTION_STATUS_LABELS[status] || EXECUTION_STATUS_LABELS.idle;
}

/**
 * Format stage name for display.
 */
function formatStageName(stage: string): string {
  const stageLabels: Record<string, string> = {
    orgs_sourced: 'sourcing organizations',
    contacts_discovered: 'discovering contacts',
    contacts_evaluated: 'evaluating contacts',
    leads_promoted: 'promoting leads',
    leads_awaiting_approval: 'awaiting approvals',
    leads_approved: 'processing approvals',
    emails_sent: 'sending emails',
    replies: 'processing replies',
  };
  return stageLabels[stage] || stage.replace(/_/g, ' ');
}

export const NSD_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const NSD_RADIUS = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  full: '9999px',
} as const;

export const NSD_TYPOGRAPHY = {
  fontDisplay: 'var(--font-display, Poppins, sans-serif)',
  fontBody: 'var(--font-body, Inter, sans-serif)',
  
  heading1: { fontSize: '32px', fontWeight: 600, lineHeight: 1.2 },
  heading2: { fontSize: '24px', fontWeight: 600, lineHeight: 1.3 },
  heading3: { fontSize: '18px', fontWeight: 600, lineHeight: 1.4 },
  heading4: { fontSize: '16px', fontWeight: 600, lineHeight: 1.4 },
  
  body: { fontSize: '14px', fontWeight: 400, lineHeight: 1.5 },
  bodySmall: { fontSize: '13px', fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: '12px', fontWeight: 400, lineHeight: 1.4 },
  label: { fontSize: '12px', fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.05em', textTransform: 'uppercase' as const },
} as const;

export const NSD_SHADOWS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
  md: '0 2px 8px rgba(0, 0, 0, 0.06)',
  lg: '0 4px 16px rgba(0, 0, 0, 0.08)',
} as const;
