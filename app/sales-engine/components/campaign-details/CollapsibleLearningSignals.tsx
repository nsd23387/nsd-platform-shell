/**
 * CollapsibleLearningSignals Component
 * 
 * DECISION-FIRST UX:
 * Learning signals displayed in a collapsible panel.
 * Deferred, collapsed by default.
 * 
 * PRINCIPLES:
 * - Collapsed by default
 * - Labeled clearly as "Post-execution insights"
 * - Never appears as an error or warning state
 * - Never implies configuration failure before execution
 * - No pink/alert styling for "no learning signals"
 */

'use client';

import { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface LearningSignal {
  id: string;
  category: string;
  title: string;
  insight: string;
  confidence: 'high' | 'medium' | 'low';
  suggestedAction?: string;
}

interface CollapsibleLearningSignalsProps {
  /** Whether execution has completed */
  hasExecutionCompleted: boolean;
  /** Learning signals from backend */
  signals: LearningSignal[];
  /** Whether signals are loading */
  isLoading?: boolean;
  /** Default expanded state */
  defaultExpanded?: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { label: 'High Confidence', color: NSD_COLORS.semantic.positive },
    medium: { label: 'Medium Confidence', color: NSD_COLORS.semantic.attention },
    low: { label: 'Low Confidence', color: NSD_COLORS.semantic.muted },
  };

  const c = config[confidence];

  return (
    <span style={{
      padding: '2px 8px',
      fontSize: '10px',
      fontWeight: 500,
      backgroundColor: c.color.bg,
      color: c.color.text,
      borderRadius: NSD_RADIUS.full,
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
    }}>
      {c.label}
    </span>
  );
}

function SignalCard({ signal }: { signal: LearningSignal }) {
  return (
    <div style={{
      backgroundColor: NSD_COLORS.surface,
      borderRadius: NSD_RADIUS.md,
      padding: '16px',
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: NSD_COLORS.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {signal.category}
        </span>
        <ConfidenceBadge confidence={signal.confidence} />
      </div>
      <h4 style={{
        margin: '0 0 8px 0',
        fontSize: '14px',
        fontWeight: 600,
        color: NSD_COLORS.text.primary,
      }}>
        {signal.title}
      </h4>
      <p style={{
        margin: 0,
        fontSize: '13px',
        color: NSD_COLORS.text.secondary,
        lineHeight: 1.5,
      }}>
        {signal.insight}
      </p>
      {signal.suggestedAction && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: NSD_COLORS.semantic.info.bg,
          borderRadius: NSD_RADIUS.sm,
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: NSD_COLORS.semantic.info.text,
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
          }}>
            Suggested Action
          </span>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: NSD_COLORS.semantic.info.text,
          }}>
            {signal.suggestedAction}
          </p>
        </div>
      )}
    </div>
  );
}

export function CollapsibleLearningSignals({
  hasExecutionCompleted,
  signals,
  isLoading = false,
  defaultExpanded = false,
}: CollapsibleLearningSignalsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasSignals = signals.length > 0;

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: NSD_RADIUS.lg,
      border: '1px solid #E5E7EB',
      marginBottom: '24px',
      overflow: 'hidden',
    }}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: NSD_RADIUS.md,
            backgroundColor: NSD_COLORS.semantic.info.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="lightbulb" size={18} color={NSD_COLORS.semantic.info.text} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: NSD_COLORS.text.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}>
              Learning Signals
            </h3>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
            }}>
              Post-execution insights • {hasSignals ? `${signals.length} insight${signals.length === 1 ? '' : 's'}` : 'Available after execution'}
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {hasSignals && (
            <span style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: NSD_COLORS.semantic.positive.bg,
              color: NSD_COLORS.semantic.positive.text,
              borderRadius: NSD_RADIUS.full,
            }}>
              {signals.length} new
            </span>
          )}
          <Icon 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={NSD_COLORS.text.muted} 
          />
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div style={{
          padding: '0 24px 24px 24px',
          borderTop: `1px solid ${NSD_COLORS.border.light}`,
          paddingTop: '20px',
        }}>
          {isLoading && (
            <div style={{
              padding: '32px',
              textAlign: 'center',
            }}>
              <Icon name="refresh" size={24} color={NSD_COLORS.text.muted} />
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '13px',
                color: NSD_COLORS.text.muted,
              }}>
                Analyzing execution data...
              </p>
            </div>
          )}

          {!isLoading && !hasExecutionCompleted && (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: NSD_COLORS.semantic.muted.bg,
              borderRadius: NSD_RADIUS.md,
            }}>
              <Icon name="clock" size={24} color={NSD_COLORS.text.muted} />
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '14px',
                color: NSD_COLORS.text.secondary,
              }}>
                Learning signals will be generated after campaign execution
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: NSD_COLORS.text.muted,
              }}>
                Insights are derived from execution results and market response data
              </p>
            </div>
          )}

          {!isLoading && hasExecutionCompleted && !hasSignals && (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: NSD_COLORS.semantic.muted.bg,
              borderRadius: NSD_RADIUS.md,
            }}>
              <Icon name="info" size={24} color={NSD_COLORS.text.muted} />
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '14px',
                color: NSD_COLORS.text.secondary,
              }}>
                No learning signals generated yet
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: NSD_COLORS.text.muted,
              }}>
                Insights typically emerge after multiple executions with sufficient engagement data
              </p>
            </div>
          )}

          {!isLoading && hasSignals && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              {signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CollapsibleLearningSignals;
