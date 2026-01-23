/**
 * DualFunnelVisualization Component
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * Displays TWO distinct funnels to clearly communicate:
 * 
 * 1. MARKET FUNNEL (Top) - "What exists in the market"
 *    - Source: observations.* tables
 *    - Represents: True market reality / addressable market
 *    - Independent of execution — exists regardless of runs
 * 
 * 2. EXECUTION FUNNEL (Bottom) - "What we've processed"
 *    - Source: public.* tables
 *    - Represents: Operational working set
 *    - Changes with each execution run
 * 
 * CRITICAL INSIGHT:
 * Market Funnel may have 10,000 orgs while Execution Funnel has 100.
 * This is NOT a failure — it shows execution progress against market reality.
 * 
 * INVARIANT:
 * Zero in Execution Funnel with data in Market Funnel = "Not yet processed"
 * Zero in Market Funnel = "Market criteria yields no matches" (valid outcome)
 */

'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

/**
 * Market funnel data from observations.* tables.
 * Represents true market reality.
 */
interface MarketFunnelData {
  /** Total organizations observed matching ICP */
  observedOrganizations: number;
  /** Total contacts observed across organizations */
  observedContacts: number;
  /** Estimated reachable contacts (with email potential) */
  estimatedReachable: number;
  /** When the market was last observed */
  observedAt?: string;
}

/**
 * Execution funnel data from public.* tables.
 * Represents processed working set.
 */
interface ExecutionFunnelData {
  /** Organizations processed in operational pipeline */
  processedOrganizations: number;
  /** Contacts processed in operational pipeline */
  processedContacts: number;
  /** Leads created from processed contacts */
  promotedLeads: number;
  /** Emails dispatched */
  sentEmails: number;
}

interface DualFunnelVisualizationProps {
  /** Market reality data from observations.* */
  marketFunnel: MarketFunnelData;
  /** Operational data from public.* */
  executionFunnel: ExecutionFunnelData;
  /** Whether data is loading */
  loading?: boolean;
  /** Whether to show compact version */
  compact?: boolean;
}

/**
 * Single funnel stage row.
 */
function FunnelStage({
  label,
  value,
  maxValue,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  subtitle?: string;
}) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '4px',
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 500,
          color: NSD_COLORS.text.primary,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: '16px',
          fontWeight: 600,
          color: NSD_COLORS.text.primary,
        }}>
          {value.toLocaleString()}
        </span>
      </div>
      <div style={{
        height: '8px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.sm,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: color,
          borderRadius: NSD_RADIUS.sm,
          transition: 'width 0.3s ease',
        }} />
      </div>
      {subtitle && (
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '11px',
          color: NSD_COLORS.text.muted,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Funnel section with header and stages.
 */
function FunnelSection({
  title,
  subtitle,
  icon,
  iconColor,
  children,
  bgTint,
}: {
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
  bgTint?: string;
}) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: bgTint || NSD_COLORS.background,
      borderRadius: NSD_RADIUS.md,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px',
      }}>
        <Icon name={icon as any} size={16} color={iconColor} />
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: NSD_COLORS.text.primary,
        }}>
          {title}
        </span>
      </div>
      <p style={{
        margin: '0 0 12px 0',
        fontSize: '11px',
        color: NSD_COLORS.text.muted,
      }}>
        {subtitle}
      </p>
      {children}
    </div>
  );
}

export function DualFunnelVisualization({
  marketFunnel,
  executionFunnel,
  loading = false,
  compact = false,
}: DualFunnelVisualizationProps) {
  if (loading) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <p style={{ margin: 0, color: NSD_COLORS.text.muted, fontSize: '14px' }}>
          Loading funnel data...
        </p>
      </div>
    );
  }

  // Calculate max values for progress bars
  const marketMax = Math.max(
    marketFunnel.observedOrganizations,
    marketFunnel.observedContacts,
    marketFunnel.estimatedReachable,
    1
  );
  const executionMax = Math.max(
    executionFunnel.processedOrganizations,
    executionFunnel.processedContacts,
    executionFunnel.promotedLeads,
    executionFunnel.sentEmails,
    1
  );

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
        <Icon name="chart" size={18} color={NSD_COLORS.primary} />
        <h3 style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          color: NSD_COLORS.text.primary,
        }}>
          Pipeline Funnels
        </h3>
      </div>

      <div style={{ padding: '16px' }}>
        {/* MARKET FUNNEL - Observed Reality */}
        <FunnelSection
          title="Market Funnel"
          subtitle="What exists in the market (observations.*)"
          icon="target"
          iconColor={NSD_COLORS.secondary}
          bgTint={NSD_COLORS.indigo.light + '40'}
        >
          <FunnelStage
            label="Organizations Observed"
            value={marketFunnel.observedOrganizations}
            maxValue={marketMax}
            color={NSD_COLORS.secondary}
          />
          <FunnelStage
            label="Contacts Observed"
            value={marketFunnel.observedContacts}
            maxValue={marketMax}
            color={NSD_COLORS.secondary}
          />
          <FunnelStage
            label="Estimated Reachable"
            value={marketFunnel.estimatedReachable}
            maxValue={marketMax}
            color={NSD_COLORS.secondary}
            subtitle="Contacts with email potential"
          />
        </FunnelSection>

        {/* Divider with explanation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '16px 0',
          padding: '0 8px',
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            backgroundColor: NSD_COLORS.border.light,
          }} />
          <span style={{
            fontSize: '11px',
            fontWeight: 500,
            color: NSD_COLORS.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
          }}>
            Execution Progress ↓
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            backgroundColor: NSD_COLORS.border.light,
          }} />
        </div>

        {/* EXECUTION FUNNEL - Processed Working Set */}
        <FunnelSection
          title="Execution Funnel"
          subtitle="What we've processed (public.*)"
          icon="metrics"
          iconColor={NSD_COLORS.primary}
          bgTint={NSD_COLORS.magenta.light + '40'}
        >
          <FunnelStage
            label="Organizations Processed"
            value={executionFunnel.processedOrganizations}
            maxValue={executionMax}
            color={NSD_COLORS.primary}
          />
          <FunnelStage
            label="Contacts Processed"
            value={executionFunnel.processedContacts}
            maxValue={executionMax}
            color={NSD_COLORS.primary}
          />
          <FunnelStage
            label="Leads Promoted"
            value={executionFunnel.promotedLeads}
            maxValue={executionMax}
            color={NSD_COLORS.cta}
          />
          <FunnelStage
            label="Emails Sent"
            value={executionFunnel.sentEmails}
            maxValue={executionMax}
            color={NSD_COLORS.cta}
            subtitle="Dispatched to recipients"
          />
        </FunnelSection>

        {/* Interpretation help */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.md,
        }}>
          <p style={{
            margin: 0,
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            lineHeight: 1.5,
          }}>
            <strong>Reading the funnels:</strong> Market Funnel shows your total addressable market. 
            Execution Funnel shows what has been processed. A gap between them means there&apos;s 
            more market to capture — not a problem to fix.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DualFunnelVisualization;
