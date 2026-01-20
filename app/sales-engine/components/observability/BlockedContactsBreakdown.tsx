'use client';

/**
 * BlockedContactsBreakdown Component
 * 
 * Expandable panel showing why contacts are blocked from becoming leads.
 * Only fetches data when expanded (lazy loading).
 * 
 * SHOULD HAVE component for blocked contact diagnostics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface BlockedReasons {
  total: number;
  reasons: {
    no_email: number;
    invalid_email: number;
    low_fit_score: number;
    excluded_title: number;
    other?: number;
  };
}

export interface BlockedContactsBreakdownProps {
  campaignId: string;
  blockedCount: number;
}

const REASON_CONFIG: Record<string, { label: string; description: string; icon: string }> = {
  no_email: { 
    label: 'No Email Available', 
    description: 'Apollo could not reveal an email for these contacts',
    icon: 'warning',
  },
  invalid_email: { 
    label: 'Invalid Email', 
    description: 'Email was revealed but failed validation checks',
    icon: 'warning',
  },
  low_fit_score: { 
    label: 'Below Fit Score Threshold', 
    description: 'Contact\'s ICP fit score is below the enrichment threshold',
    icon: 'chart',
  },
  excluded_title: { 
    label: 'Excluded Job Title', 
    description: 'Contact\'s job title matches the exclusion list',
    icon: 'users',
  },
  other: {
    label: 'Other Reasons',
    description: 'Blocked for uncategorized reasons',
    icon: 'info',
  },
};

export function BlockedContactsBreakdown({ 
  campaignId, 
  blockedCount,
}: BlockedContactsBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reasons, setReasons] = useState<BlockedReasons | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReasons = useCallback(async () => {
    if (blockedCount === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/contact-stats/blocked-reasons`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      setReasons(data);
    } catch (err) {
      console.error('[BlockedContactsBreakdown] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, blockedCount]);

  // Fetch when expanded
  useEffect(() => {
    if (isExpanded && !reasons && blockedCount > 0) {
      fetchReasons();
    }
  }, [isExpanded, reasons, blockedCount, fetchReasons]);

  // Don't render if no blocked contacts
  if (blockedCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = NSD_COLORS.surfaceHover}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: NSD_COLORS.semantic.critical.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="warning" size={16} color={NSD_COLORS.semantic.critical.text} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <span
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: NSD_COLORS.text.primary,
              }}
            >
              Blocked Contacts
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '12px',
                color: NSD_COLORS.text.muted,
              }}
            >
              {blockedCount.toLocaleString()} contacts cannot become leads
            </span>
          </div>
        </div>
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <Icon 
            name="arrow-right"
            size={16} 
            color={NSD_COLORS.text.muted} 
          />
        </span>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div
          style={{
            padding: '0 20px 20px 20px',
            borderTop: `1px solid ${NSD_COLORS.border.light}`,
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: NSD_COLORS.text.muted,
                fontSize: '13px',
              }}
            >
              Loading breakdown...
            </div>
          ) : error ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: NSD_COLORS.semantic.critical.text,
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          ) : reasons ? (
            <div style={{ marginTop: '16px' }}>
              {/* Reason breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(reasons.reasons).map(([key, count]) => {
                  if (count === 0) return null;
                  const config = REASON_CONFIG[key] || REASON_CONFIG.other;
                  const percentage = reasons.total > 0 
                    ? Math.round((count / reasons.total) * 100) 
                    : 0;
                  
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '12px',
                        backgroundColor: NSD_COLORS.background,
                        borderRadius: NSD_RADIUS.md,
                        border: `1px solid ${NSD_COLORS.border.light}`,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                          }}
                        >
                          <Icon name={config.icon as any} size={14} color={NSD_COLORS.text.secondary} />
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: NSD_COLORS.text.primary,
                            }}
                          >
                            {config.label}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            color: NSD_COLORS.text.muted,
                            lineHeight: 1.4,
                          }}
                        >
                          {config.description}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '16px',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            color: NSD_COLORS.text.primary,
                          }}
                        >
                          {count.toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: NSD_COLORS.text.muted,
                          }}
                        >
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reconciliation note */}
              {reasons.total !== blockedCount && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '10px 12px',
                    backgroundColor: NSD_COLORS.semantic.attention.bg,
                    borderRadius: NSD_RADIUS.md,
                    border: `1px solid ${NSD_COLORS.semantic.attention.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Icon name="info" size={14} color={NSD_COLORS.semantic.attention.text} />
                  <span
                    style={{
                      fontSize: '12px',
                      color: NSD_COLORS.semantic.attention.text,
                    }}
                  >
                    Note: Some blocked contacts may have uncategorized reasons
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default BlockedContactsBreakdown;
