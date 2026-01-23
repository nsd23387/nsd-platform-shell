/**
 * CampaignHealthSummary Component
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * Displays a unified health summary for a campaign, clearly distinguishing:
 * - Governance status (campaign.status - administrative state)
 * - Execution outcome (last run outcomeType)
 * - Market reality (observed market size)
 * - Operational yield (processed working set)
 * 
 * CRITICAL DISTINCTION:
 * Governance ≠ Execution ≠ Outcome
 * - Governance: Administrative approval state
 * - Execution: Whether the system ran
 * - Outcome: What happened when it ran
 * 
 * Uses: /api/proxy/campaign-overview
 */

'use client';

import { useState, useEffect } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { getOutcomeMessage, type OutcomeType } from '../../lib/outcome-messaging';

/**
 * Campaign overview data from the proxy endpoint.
 */
interface CampaignOverview {
  campaignId: string;
  governance: {
    status: string;
    isRunnable: boolean;
    isPlanningOnly: boolean;
  };
  lastExecution: {
    runId: string;
    status: string;
    outcomeType: OutcomeType;
    outcomeReason?: string;
    startedAt: string;
    endedAt?: string;
  } | null;
  marketReality: {
    observedOrganizations: number;
    observedContacts: number;
    estimatedReachable: number;
    observedAt: string | null;
  };
  operationalYield: {
    processedOrganizations: number;
    processedContacts: number;
    promotedLeads: number;
    sentEmails: number;
  };
  _source?: string;
}

interface CampaignHealthSummaryProps {
  campaignId: string;
  /** Optional callback when data loads */
  onLoad?: (data: CampaignOverview) => void;
}

/**
 * Map governance status to display configuration.
 * Governance is administrative state, NOT execution state.
 */
function getGovernanceDisplay(status: string): { label: string; color: typeof NSD_COLORS.semantic.muted } {
  const statusMap: Record<string, { label: string; color: typeof NSD_COLORS.semantic.muted }> = {
    'DRAFT': { label: 'Draft', color: NSD_COLORS.semantic.muted },
    'PENDING_REVIEW': { label: 'Pending Review', color: NSD_COLORS.semantic.attention },
    'RUNNABLE': { label: 'Ready', color: NSD_COLORS.semantic.info },
    'RUNNING': { label: 'Active', color: NSD_COLORS.semantic.active },
    'COMPLETED': { label: 'Archived', color: NSD_COLORS.semantic.positive },
    'FAILED': { label: 'Needs Attention', color: NSD_COLORS.semantic.critical },
  };
  return statusMap[status] || { label: status, color: NSD_COLORS.semantic.muted };
}

export function CampaignHealthSummary({ campaignId, onLoad }: CampaignHealthSummaryProps) {
  const [data, setData] = useState<CampaignOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOverview() {
      if (!campaignId) return;
      
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/proxy/campaign-overview?campaignId=${encodeURIComponent(campaignId)}`);
        const result = await response.json();
        
        setData(result);
        onLoad?.(result);
      } catch (err) {
        console.error('[CampaignHealthSummary] Fetch error:', err);
        setError('Unable to load campaign health data');
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, [campaignId, onLoad]);

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <p style={{ margin: 0, color: NSD_COLORS.text.muted, fontSize: '14px' }}>
          Loading campaign health...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: NSD_COLORS.semantic.attention.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.semantic.attention.border}`,
      }}>
        <p style={{ margin: 0, color: NSD_COLORS.semantic.attention.text, fontSize: '14px' }}>
          {error || 'Campaign health data unavailable'}
        </p>
      </div>
    );
  }

  const governance = getGovernanceDisplay(data.governance.status);
  const outcome = data.lastExecution ? getOutcomeMessage(data.lastExecution.outcomeType) : null;

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
        <Icon name="chart" size={18} color={NSD_COLORS.secondary} />
        <h3 style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          color: NSD_COLORS.text.primary,
        }}>
          Campaign Health
        </h3>
      </div>

      {/* Grid of metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1px',
        backgroundColor: NSD_COLORS.border.light,
      }}>
        {/* Governance Status */}
        <div style={{ padding: '16px', backgroundColor: NSD_COLORS.background }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: NSD_COLORS.text.muted,
            marginBottom: '8px',
          }}>
            Governance Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: governance.color.bg,
              color: governance.color.text,
              borderRadius: NSD_RADIUS.sm,
            }}>
              {governance.label}
            </span>
            {data.governance.isPlanningOnly && (
              <span style={{
                fontSize: '11px',
                color: NSD_COLORS.text.muted,
                fontStyle: 'italic',
              }}>
                (Planning Only)
              </span>
            )}
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
          }}>
            Administrative approval state
          </p>
        </div>

        {/* Last Execution Outcome */}
        <div style={{ padding: '16px', backgroundColor: NSD_COLORS.background }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: NSD_COLORS.text.muted,
            marginBottom: '8px',
          }}>
            Last Execution Outcome
          </div>
          {outcome ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name={outcome.icon as any} size={16} color={outcome.colors.text} />
                <span style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: outcome.colors.bg,
                  color: outcome.colors.text,
                  borderRadius: NSD_RADIUS.sm,
                }}>
                  {outcome.label}
                </span>
              </div>
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '11px',
                color: NSD_COLORS.text.muted,
              }}>
                {data.lastExecution?.outcomeReason || outcome.headline}
              </p>
            </>
          ) : (
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: NSD_COLORS.text.muted,
            }}>
              No executions yet
            </p>
          )}
        </div>

        {/* Market Reality */}
        <div style={{ padding: '16px', backgroundColor: NSD_COLORS.background }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: NSD_COLORS.text.muted,
            marginBottom: '8px',
          }}>
            Market Reality
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {data.marketReality.observedOrganizations.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Orgs observed</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {data.marketReality.observedContacts.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Contacts</div>
            </div>
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
          }}>
            From observations.* — true market scope
          </p>
        </div>

        {/* Operational Yield */}
        <div style={{ padding: '16px', backgroundColor: NSD_COLORS.background }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: NSD_COLORS.text.muted,
            marginBottom: '8px',
          }}>
            Operational Yield
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {data.operationalYield.promotedLeads.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Leads</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                {data.operationalYield.sentEmails.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Emails sent</div>
            </div>
          </div>
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
          }}>
            From public.* — processed working set
          </p>
        </div>
      </div>
    </div>
  );
}

export default CampaignHealthSummary;
