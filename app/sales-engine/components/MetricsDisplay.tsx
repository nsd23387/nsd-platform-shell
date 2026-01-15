'use client';

import type { CampaignMetrics, MetricsHistoryEntry } from '../types/campaign';
import { ConfidenceBadge, ProvenancePill } from './governance';
import { deriveConfidence, deriveProvenance } from '../lib/campaign-state';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../lib/design-tokens';
import { Icon } from '../../../design/components/Icon';

interface MetricsDisplayProps {
  metrics: CampaignMetrics;
  history?: MetricsHistoryEntry[];
}

/**
 * MetricsDisplay - Campaign metrics with confidence badges.
 * 
 * Updated for target-state architecture:
 * - Shows confidence classification for each metric
 * - Uses "Promoted Leads" terminology (not "Contacts")
 * - Displays provenance indicator
 * 
 * CRITICAL SEMANTIC DISTINCTION:
 * - Contacts and leads are distinct; leads are conditionally promoted.
 * - Lead count reflects PROMOTED leads only (Tier A/B), NOT total contacts.
 * - Tier C/D contacts are never leads and are not included.
 * - Promotion requires ICP fit AND real (non-placeholder) email.
 * 
 * IMPORTANT: Confidence is derived from ACTUAL backend metadata only.
 * - If metrics.confidence or metrics.validation_status is present, use it
 * - If not present, default to CONDITIONAL (uncertain) - never assume SAFE
 * - If BLOCKED, metrics are visually muted
 * 
 * This ensures we never display "Safe" confidence without explicit backend validation.
 */
export function MetricsDisplay({ metrics, history }: MetricsDisplayProps) {
  const metricConfidence = deriveConfidence({
    validation_status: metrics.validation_status,
    confidence: metrics.confidence,
    provenance: metrics.provenance,
  });

  const metricProvenance = deriveProvenance({
    provenance: metrics.provenance,
  });

  const hasExplicitConfidence = !!(metrics.confidence || metrics.validation_status);

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.primary,
          }}
        >
          Campaign Metrics
        </h4>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ProvenancePill provenance={metricProvenance} />
          <ConfidenceBadge confidence={metricConfidence} />
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* 
            Promoted Leads count - distinct from total contacts.
            Contacts and leads are distinct; leads are conditionally promoted.
            This count reflects Tier A/B promoted leads only.
          */}
          <MetricCard 
            label="Promoted Leads" 
            value={metrics.total_leads}
            confidence={metricConfidence}
            tooltip="Leads promoted from contacts (Tier A/B). Requires ICP fit and valid email. Does not include Tier C/D contacts."
          />
          <MetricCard 
            label="Emails Sent" 
            value={metrics.emails_sent}
            confidence={metricConfidence}
            tooltip="Total emails successfully dispatched by the backend system."
          />
          <MetricCard 
            label="Emails Opened" 
            value={metrics.emails_opened} 
            suffix={metrics.open_rate !== undefined ? `(${(metrics.open_rate * 100).toFixed(1)}%)` : undefined}
            confidence={metricConfidence}
            tooltip="Emails opened as tracked by the backend. Open tracking may have limitations."
          />
          <MetricCard 
            label="Emails Replied" 
            value={metrics.emails_replied} 
            suffix={metrics.reply_rate !== undefined ? `(${(metrics.reply_rate * 100).toFixed(1)}%)` : undefined}
            confidence={metricConfidence}
            tooltip="Emails that received a reply. Positive intent is determined by backend classification."
          />
        </div>

        <p
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
            margin: 0,
          }}
        >
          Last updated: {new Date(metrics.last_updated).toLocaleString()}
        </p>

        {!hasExplicitConfidence && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 16px',
              backgroundColor: NSD_COLORS.semantic.attention.bg,
              borderRadius: NSD_RADIUS.md,
              border: `1px solid ${NSD_COLORS.semantic.attention.border}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <Icon name="info" size={16} color={NSD_COLORS.semantic.attention.text} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: NSD_COLORS.semantic.attention.text,
                }}
              >
                Observed (Unclassified)
              </p>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: NSD_COLORS.semantic.attention.text,
                  lineHeight: 1.5,
                }}
              >
                These metrics do not have explicit validation metadata from the backend.
                Confidence is shown as Conditional until validation is performed by the data governance team.
              </p>
            </div>
          </div>
        )}

        {history && history.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h5
              style={{
                margin: '0 0 12px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: NSD_COLORS.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Recent History (Observed)
            </h5>
            <div
              style={{
                overflowX: 'auto',
                borderRadius: NSD_RADIUS.md,
                border: `1px solid ${NSD_COLORS.border.light}`,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: NSD_COLORS.surface }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Time</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Sent</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Opened</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Replied</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((entry, idx) => (
                    <tr key={idx} style={{ borderTop: `1px solid ${NSD_COLORS.border.light}` }}>
                      <td style={{ padding: '10px 14px', color: NSD_COLORS.text.primary }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px', color: NSD_COLORS.text.primary, textAlign: 'right' }}>{entry.emails_sent}</td>
                      <td style={{ padding: '10px 14px', color: NSD_COLORS.text.primary, textAlign: 'right' }}>{entry.emails_opened}</td>
                      <td style={{ padding: '10px 14px', color: NSD_COLORS.text.primary, textAlign: 'right' }}>{entry.emails_replied}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  suffix,
  confidence,
  tooltip,
}: { 
  label: string; 
  value: number; 
  suffix?: string;
  confidence: ReturnType<typeof deriveConfidence>;
  tooltip?: string;
}) {
  const isBlocked = confidence === 'BLOCKED';
  
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        opacity: isBlocked ? 0.6 : 1,
        transition: 'opacity 0.2s ease',
      }}
      title={tooltip}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: NSD_COLORS.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {label}
        </span>
        <ConfidenceBadge confidence={confidence} size="sm" />
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 700,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          color: isBlocked ? NSD_COLORS.text.muted : NSD_COLORS.primary,
        }}
      >
        {value.toLocaleString()}
        {suffix && (
          <span
            style={{
              fontSize: '13px',
              fontWeight: 400,
              color: NSD_COLORS.text.secondary,
              marginLeft: '6px',
            }}
          >
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}
