'use client';

import { NSD_COLORS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  helpText?: string;
}

/**
 * SectionHeader - Consistent section labeling for observability panels.
 * 
 * Used to clearly demarcate sections like:
 * - "Administrative State"
 * - "Last Execution Outcome"
 * - "Market Reality"
 * - "Operational Yield"
 * 
 * Includes optional helper text via info icon tooltip.
 */
export function SectionHeader({ title, subtitle, icon, helpText }: SectionHeaderProps) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      {icon && (
        <Icon 
          name={icon as any} 
          size={18} 
          color={NSD_COLORS.text.muted} 
        />
      )}
      <div style={{ flex: 1 }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '13px', 
          fontWeight: 600,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
          color: NSD_COLORS.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ 
            margin: '2px 0 0 0', 
            fontSize: '12px', 
            color: NSD_COLORS.text.muted,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {helpText && (
        <InfoTooltip text={helpText} />
      )}
    </div>
  );
}

interface InfoTooltipProps {
  text: string;
}

/**
 * InfoTooltip - Inline helper text via hover tooltip.
 * 
 * Used to explain:
 * - Why gaps between Market Reality and Operational Yield are normal
 * - Why zero counts are valid observations, not failures
 * - What each section represents
 */
export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <div 
      style={{ 
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'help',
      }}
      title={text}
    >
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: NSD_COLORS.semantic.info.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 600,
        color: NSD_COLORS.semantic.info.text,
      }}>
        ℹ
      </div>
    </div>
  );
}

/**
 * HelperText - Inline explanatory text for observability concepts.
 * 
 * Used to clarify:
 * - "Zero is valid" messaging
 * - "Gaps are opportunities" messaging
 * - What each data source represents
 */
export function HelperText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: '8px 0 0 0',
      padding: '8px 12px',
      fontSize: '12px',
      fontStyle: 'italic',
      color: NSD_COLORS.text.muted,
      backgroundColor: NSD_COLORS.semantic.info.bg,
      borderRadius: '6px',
      borderLeft: `3px solid ${NSD_COLORS.semantic.info.border}`,
      fontFamily: NSD_TYPOGRAPHY.fontBody,
    }}>
      {children}
    </p>
  );
}
