/**
 * RunIntentSelector Component
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * Allows users to select the intent for a campaign run with explicit
 * communication of consequences for each option.
 * 
 * RUN INTENTS:
 * 
 * HARVEST_ONLY:
 * - Observes market and collects data
 * - NO emails are sent
 * - Safe for validation and testing
 * - Use to verify ICP before committing
 * 
 * ACTIVATE:
 * - Full execution with email dispatch
 * - Leads are contacted
 * - Commits to outreach
 * - Use when ready for engagement
 * 
 * CRITICAL:
 * Users must understand the difference before execution.
 * The UI must make consequences explicit.
 */

'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

export type RunIntent = 'HARVEST_ONLY' | 'ACTIVATE';

interface RunIntentSelectorProps {
  /** Currently selected intent */
  value: RunIntent;
  /** Callback when intent changes */
  onChange: (intent: RunIntent) => void;
  /** Whether selection is disabled (e.g., during run) */
  disabled?: boolean;
  /** Whether to show compact version */
  compact?: boolean;
}

/**
 * Configuration for each run intent option.
 */
const INTENT_CONFIG: Record<RunIntent, {
  label: string;
  headline: string;
  description: string;
  consequences: string[];
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  safetyLevel: 'safe' | 'commits';
}> = {
  HARVEST_ONLY: {
    label: 'Harvest Only',
    headline: 'Observe market without outreach',
    description: 'Analyze market data and collect qualifying leads without sending any emails.',
    consequences: [
      'Market data is observed and analyzed',
      'Leads are identified and scored',
      'NO emails are dispatched',
      'Safe for testing and validation',
    ],
    icon: 'target',
    color: NSD_COLORS.secondary,
    bgColor: NSD_COLORS.indigo.light,
    borderColor: NSD_COLORS.secondary,
    safetyLevel: 'safe',
  },
  ACTIVATE: {
    label: 'Activate',
    headline: 'Full execution with email outreach',
    description: 'Execute the complete campaign including email dispatch to qualified leads.',
    consequences: [
      'Market data is observed and analyzed',
      'Leads are identified and promoted',
      'Emails ARE dispatched to recipients',
      'Commits to actual outreach',
    ],
    icon: 'campaigns',
    color: NSD_COLORS.cta,
    bgColor: NSD_COLORS.magenta.light,
    borderColor: NSD_COLORS.cta,
    safetyLevel: 'commits',
  },
};

/**
 * Intent option card with full details.
 */
function IntentOption({
  intent,
  isSelected,
  disabled,
  onClick,
}: {
  intent: RunIntent;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const config = INTENT_CONFIG[intent];
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '16px',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${isSelected ? config.borderColor : NSD_COLORS.border.light}`,
        borderLeft: `4px solid ${isSelected ? config.borderColor : NSD_COLORS.border.light}`,
        borderRadius: NSD_RADIUS.lg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        textAlign: 'left',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: NSD_RADIUS.md,
          backgroundColor: '#F9FAFB',
          border: `1px solid ${isSelected ? config.borderColor : NSD_COLORS.border.light}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon 
            name={config.icon as any} 
            size={18} 
            color={isSelected ? config.color : NSD_COLORS.text.muted} 
          />
        </div>
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: isSelected ? config.color : NSD_COLORS.text.primary,
          }}>
            {config.label}
          </div>
          <div style={{
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <Icon 
              name={config.safetyLevel === 'safe' ? 'check' : 'warning'} 
              size={10} 
              color={NSD_COLORS.text.muted} 
            />
            {config.safetyLevel === 'safe' ? 'Safe to test' : 'Commits to outreach'}
          </div>
        </div>
        {isSelected && (
          <div style={{
            marginLeft: 'auto',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: `2px solid ${config.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="check" size={12} color={config.color} />
          </div>
        )}
      </div>

      {/* Description */}
      <p style={{
        margin: '0 0 12px 0',
        fontSize: '12px',
        color: NSD_COLORS.text.secondary,
        lineHeight: 1.4,
      }}>
        {config.description}
      </p>

      {/* Consequences */}
      <div style={{
        padding: '10px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: NSD_RADIUS.sm,
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: NSD_COLORS.text.muted,
          marginBottom: '6px',
        }}>
          What happens:
        </div>
        <ul style={{
          margin: 0,
          padding: '0 0 0 16px',
          fontSize: '11px',
          color: NSD_COLORS.text.secondary,
          lineHeight: 1.6,
        }}>
          {config.consequences.map((consequence, i) => (
            <li key={i} style={{
              color: consequence.includes('NO emails') || consequence.includes('Commits') 
                ? (isSelected ? config.color : NSD_COLORS.text.primary)
                : undefined,
              fontWeight: consequence.includes('NO emails') || consequence.includes('Commits') 
                ? 600 : undefined,
            }}>
              {consequence}
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

export function RunIntentSelector({
  value,
  onChange,
  disabled = false,
  compact = false,
}: RunIntentSelectorProps) {
  return (
    <div style={{
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      boxShadow: NSD_SHADOWS.sm,
      border: `1px solid ${NSD_COLORS.border.light}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${NSD_COLORS.border.light}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <Icon name="campaigns" size={18} color={NSD_COLORS.primary} />
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.text.primary,
          }}>
            Run Intent
          </h3>
          <p style={{
            margin: '2px 0 0 0',
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
          }}>
            Select what you want this execution to do
          </p>
        </div>
      </div>

      {/* Options */}
      <div style={{
        padding: '16px',
        display: 'flex',
        gap: '12px',
        flexDirection: compact ? 'row' : 'column',
      }}>
        <IntentOption
          intent="HARVEST_ONLY"
          isSelected={value === 'HARVEST_ONLY'}
          disabled={disabled}
          onClick={() => onChange('HARVEST_ONLY')}
        />
        <IntentOption
          intent="ACTIVATE"
          isSelected={value === 'ACTIVATE'}
          disabled={disabled}
          onClick={() => onChange('ACTIVATE')}
        />
      </div>

      {/* Warning for ACTIVATE */}
      {value === 'ACTIVATE' && !disabled && (
        <div style={{
          margin: '0 16px 16px 16px',
          padding: '10px 12px',
          backgroundColor: '#FFFFFF',
          borderRadius: NSD_RADIUS.md,
          border: '1px solid #E5E7EB',
          borderLeft: `4px solid ${NSD_COLORS.magenta.base}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Icon name="warning" size={16} color={NSD_COLORS.magenta.base} />
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: NSD_COLORS.text.primary,
          }}>
            <strong style={{ color: NSD_COLORS.magenta.base }}>Activate</strong> will send real emails to qualified leads. Make sure your campaign is ready.
          </p>
        </div>
      )}

      {/* Disabled message */}
      {disabled && (
        <div style={{
          margin: '0 16px 16px 16px',
          padding: '10px 12px',
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.md,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Icon name="clock" size={16} color={NSD_COLORS.text.muted} />
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
          }}>
            Run intent cannot be changed while a run is in progress.
          </p>
        </div>
      )}
    </div>
  );
}

export default RunIntentSelector;
