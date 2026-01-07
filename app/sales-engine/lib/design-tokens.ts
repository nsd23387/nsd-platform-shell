export const NSD_COLORS = {
  primary: '#020F5A',
  secondary: '#692BAA',
  cta: '#CC368F',
  
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceHover: '#F3F4F6',
  
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    muted: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  
  border: {
    light: '#E5E7EB',
    default: '#D1D5DB',
    dark: '#9CA3AF',
  },
  
  status: {
    draft: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
    pendingReview: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    approvedReady: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
    running: { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },
    completed: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
    failed: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
    archived: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
  },
  
  /**
   * Semantic status colors - Brand-aligned replacements for literal colors.
   * Use these instead of success/warning/error for consistent branding.
   * 
   * Brand palette mapping:
   * - active: Indigo (running processes, active states)
   * - positive: Indigo-tinted (completed, success states - NOT green)
   * - attention: Brand amber (needs review, conditional states)
   * - critical: Brand coral (failures, blocked states)
   * - muted: Neutral gray (idle, pending states)
   */
  semantic: {
    active: { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },     // Indigo - running/active
    positive: { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },   // Indigo - completed/success
    attention: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },  // Amber - warning/review
    critical: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },   // Coral - error/failed
    muted: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' },      // Gray - idle/pending
    info: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },       // Blue - informational
  },
  
  // Legacy colors - kept for backwards compatibility but prefer semantic.* above
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

/**
 * Semantic status style mapping for execution states.
 * Returns brand-aligned colors (NO green/yellow/red).
 */
export function getSemanticStatusStyle(status: string): { bg: string; text: string; border: string } {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    // Execution states
    idle: NSD_COLORS.semantic.muted,
    run_requested: NSD_COLORS.semantic.info,
    running: NSD_COLORS.semantic.active,
    awaiting_approvals: NSD_COLORS.semantic.attention,
    completed: NSD_COLORS.semantic.positive,
    failed: NSD_COLORS.semantic.critical,
    partial: NSD_COLORS.semantic.attention,
    
    // Run status
    COMPLETED: NSD_COLORS.semantic.positive,
    FAILED: NSD_COLORS.semantic.critical,
    PARTIAL: NSD_COLORS.semantic.attention,
    
    // Generic
    success: NSD_COLORS.semantic.positive,
    error: NSD_COLORS.semantic.critical,
    warning: NSD_COLORS.semantic.attention,
    active: NSD_COLORS.semantic.active,
  };
  
  return styles[status] || NSD_COLORS.semantic.muted;
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
