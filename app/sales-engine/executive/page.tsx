/**
 * Executive Dashboard Page
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * Read-only executive metrics dashboard.
 * 
 * CRITICAL CONSTRAINTS:
 * - NO execution controls (no Run buttons)
 * - NO governance actions (no Approve/Reject)
 * - PURE observability — metrics only
 * - Uses /api/proxy/executive-summary
 * 
 * PURPOSE:
 * Provide executives with confidence in system health
 * without exposing operational complexity or controls.
 * 
 * METRICS SHOWN:
 * - Campaign counts by governance status
 * - Recent execution outcomes by type
 * - Aggregate market reality
 * - Aggregate operational yield
 * - System health indicators
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS, NSD_GRADIENTS } from '../lib/design-tokens';
import { Icon } from '../../../design/components/Icon';
import { getOutcomeMessage, type OutcomeType } from '../lib/outcome-messaging';

/**
 * Executive summary data structure.
 */
interface ExecutiveSummary {
  timestamp: string;
  campaigns: {
    total: number;
    byGovernanceStatus: Record<string, number>;
  };
  recentOutcomes: {
    last24h: {
      total: number;
      SUCCESS: number;
      VALID_EMPTY_OBSERVATION: number;
      CONFIG_INCOMPLETE: number;
      INFRA_ERROR: number;
      EXECUTION_ERROR: number;
    };
    last7d: {
      total: number;
      SUCCESS: number;
      VALID_EMPTY_OBSERVATION: number;
      CONFIG_INCOMPLETE: number;
      INFRA_ERROR: number;
      EXECUTION_ERROR: number;
    };
  };
  marketReality: {
    totalObservedOrganizations: number;
    totalObservedContacts: number;
    totalEstimatedReachable: number;
  };
  operationalYield: {
    totalProcessedOrganizations: number;
    totalProcessedContacts: number;
    totalPromotedLeads: number;
    totalSentEmails: number;
  };
  health: {
    systemStatus: 'healthy' | 'degraded' | 'down' | 'unknown';
    lastSuccessfulExecution: string | null;
    errorRate24h: number;
  };
  _source?: string;
}

/**
 * Metric card for large numbers.
 */
function MetricCard({
  label,
  value,
  subtitle,
  color,
  trend,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  color?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      boxShadow: NSD_SHADOWS.sm,
      border: `1px solid ${NSD_COLORS.border.light}`,
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: NSD_COLORS.text.muted,
        marginBottom: '8px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '32px',
        fontWeight: 700,
        color: color || NSD_COLORS.text.primary,
        fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        lineHeight: 1,
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtitle && (
        <div style={{
          fontSize: '12px',
          color: NSD_COLORS.text.muted,
          marginTop: '4px',
        }}>
          {subtitle}
        </div>
      )}
      {trend && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '8px',
          fontSize: '12px',
          color: trend.value >= 0 ? NSD_COLORS.semantic.positive.text : NSD_COLORS.semantic.critical.text,
        }}>
          <Icon name={trend.value >= 0 ? 'check' : 'warning'} size={12} />
          {trend.label}
        </div>
      )}
    </div>
  );
}

/**
 * Outcome distribution bar.
 */
function OutcomeDistribution({
  title,
  data,
}: {
  title: string;
  data: {
    total: number;
    SUCCESS: number;
    VALID_EMPTY_OBSERVATION: number;
    CONFIG_INCOMPLETE: number;
    INFRA_ERROR: number;
    EXECUTION_ERROR: number;
  };
}) {
  const outcomes: OutcomeType[] = ['SUCCESS', 'VALID_EMPTY_OBSERVATION', 'CONFIG_INCOMPLETE', 'INFRA_ERROR', 'EXECUTION_ERROR'];
  
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '8px',
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 500,
          color: NSD_COLORS.text.primary,
        }}>
          {title}
        </span>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: NSD_COLORS.text.primary,
        }}>
          {data.total} runs
        </span>
      </div>
      
      {/* Stacked bar */}
      {data.total > 0 && (
        <div style={{
          height: '24px',
          borderRadius: NSD_RADIUS.sm,
          overflow: 'hidden',
          display: 'flex',
          backgroundColor: NSD_COLORS.surface,
        }}>
          {outcomes.map((outcome) => {
            const count = data[outcome];
            if (count === 0) return null;
            const percentage = (count / data.total) * 100;
            const message = getOutcomeMessage(outcome);
            return (
              <div
                key={outcome}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: message.colors.bg,
                  borderRight: `1px solid ${NSD_COLORS.background}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={`${message.label}: ${count}`}
              >
                {percentage > 10 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: message.colors.text,
                  }}>
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '8px',
      }}>
        {outcomes.map((outcome) => {
          const count = data[outcome];
          if (count === 0) return null;
          const message = getOutcomeMessage(outcome);
          return (
            <div key={outcome} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: message.colors.bg,
                border: `1px solid ${message.colors.border}`,
              }} />
              <span style={{
                fontSize: '11px',
                color: NSD_COLORS.text.muted,
              }}>
                {message.label} ({count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * System health indicator.
 */
function HealthIndicator({ status, errorRate, lastSuccess }: {
  status: string;
  errorRate: number;
  lastSuccess: string | null;
}) {
  const statusConfig: Record<string, { label: string; color: typeof NSD_COLORS.semantic.positive }> = {
    healthy: { label: 'Healthy', color: NSD_COLORS.semantic.positive },
    degraded: { label: 'Degraded', color: NSD_COLORS.semantic.attention },
    down: { label: 'Down', color: NSD_COLORS.semantic.critical },
    unknown: { label: 'Unknown', color: NSD_COLORS.semantic.muted },
  };
  
  const config = statusConfig[status] || statusConfig.unknown;
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: config.color.bg,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${config.color.border}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px',
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: config.color.text,
        }} />
        <span style={{
          fontSize: '16px',
          fontWeight: 600,
          color: config.color.text,
        }}>
          System {config.label}
        </span>
      </div>
      <div style={{
        display: 'flex',
        gap: '24px',
        fontSize: '12px',
        color: config.color.text,
      }}>
        <div>
          <strong>Error Rate (24h):</strong> {(errorRate * 100).toFixed(1)}%
        </div>
        {lastSuccess && (
          <div>
            <strong>Last Success:</strong> {new Date(lastSuccess).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExecutiveDashboardPage() {
  const [data, setData] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/proxy/executive-summary');
      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[ExecutiveDashboard] Fetch error:', err);
      setError('Unable to load executive summary');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface }}>
      {/* Header gradient bar */}
      <div style={{
        height: '4px',
        background: NSD_GRADIENTS.accentBar,
      }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
        {/* Page Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px',
            }}>
              <Link href="/sales-engine" style={{
                fontSize: '14px',
                color: NSD_COLORS.text.muted,
                textDecoration: 'none',
              }}>
                ← Back to Campaigns
              </Link>
            </div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              color: NSD_COLORS.text.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}>
              Executive Dashboard
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '14px',
              color: NSD_COLORS.text.secondary,
            }}>
              Read-only metrics overview • No execution controls
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{
              fontSize: '12px',
              color: NSD_COLORS.text.muted,
            }}>
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: NSD_COLORS.background,
                color: NSD_COLORS.text.primary,
                border: `1px solid ${NSD_COLORS.border.light}`,
                borderRadius: NSD_RADIUS.md,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '16px',
            marginBottom: '24px',
            backgroundColor: NSD_COLORS.semantic.critical.bg,
            borderRadius: NSD_RADIUS.lg,
            border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
          }}>
            <p style={{ margin: 0, color: NSD_COLORS.semantic.critical.text }}>
              {error}
            </p>
          </div>
        )}

        {data && (
          <>
            {/* System Health */}
            <div style={{ marginBottom: '24px' }}>
              <HealthIndicator
                status={data.health.systemStatus}
                errorRate={data.health.errorRate24h}
                lastSuccess={data.health.lastSuccessfulExecution}
              />
            </div>

            {/* Key Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '32px',
            }}>
              <MetricCard
                label="Total Campaigns"
                value={data.campaigns.total}
              />
              <MetricCard
                label="Market Observed"
                value={data.marketReality.totalObservedOrganizations}
                subtitle="Organizations"
                color={NSD_COLORS.secondary}
              />
              <MetricCard
                label="Leads Promoted"
                value={data.operationalYield.totalPromotedLeads}
                subtitle="From execution"
                color={NSD_COLORS.primary}
              />
              <MetricCard
                label="Emails Sent"
                value={data.operationalYield.totalSentEmails}
                subtitle="Total dispatched"
                color={NSD_COLORS.cta}
              />
            </div>

            {/* Two Column Layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
            }}>
              {/* Left: Execution Outcomes */}
              <div style={{
                padding: '20px',
                backgroundColor: NSD_COLORS.background,
                borderRadius: NSD_RADIUS.lg,
                boxShadow: NSD_SHADOWS.sm,
                border: `1px solid ${NSD_COLORS.border.light}`,
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: NSD_COLORS.text.primary,
                }}>
                  Execution Outcomes
                </h3>
                <OutcomeDistribution
                  title="Last 24 Hours"
                  data={data.recentOutcomes.last24h}
                />
                <OutcomeDistribution
                  title="Last 7 Days"
                  data={data.recentOutcomes.last7d}
                />
              </div>

              {/* Right: Market & Yield */}
              <div style={{
                padding: '20px',
                backgroundColor: NSD_COLORS.background,
                borderRadius: NSD_RADIUS.lg,
                boxShadow: NSD_SHADOWS.sm,
                border: `1px solid ${NSD_COLORS.border.light}`,
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: NSD_COLORS.text.primary,
                }}>
                  Market Reality vs Operational Yield
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}>
                  {/* Market Reality */}
                  <div style={{
                    padding: '16px',
                    backgroundColor: NSD_COLORS.indigo.light + '40',
                    borderRadius: NSD_RADIUS.md,
                  }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: NSD_COLORS.text.muted,
                      marginBottom: '12px',
                    }}>
                      Market Reality
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Organizations</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                        {data.marketReality.totalObservedOrganizations.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Contacts</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                        {data.marketReality.totalObservedContacts.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Est. Reachable</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                        {data.marketReality.totalEstimatedReachable.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Operational Yield */}
                  <div style={{
                    padding: '16px',
                    backgroundColor: NSD_COLORS.magenta.light + '40',
                    borderRadius: NSD_RADIUS.md,
                  }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: NSD_COLORS.text.muted,
                      marginBottom: '12px',
                    }}>
                      Operational Yield
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Orgs Processed</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                        {data.operationalYield.totalProcessedOrganizations.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Leads</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                        {data.operationalYield.totalPromotedLeads.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: NSD_COLORS.text.muted }}>Emails Sent</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                        {data.operationalYield.totalSentEmails.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <p style={{
                  margin: '12px 0 0 0',
                  fontSize: '11px',
                  color: NSD_COLORS.text.muted,
                }}>
                  Market Reality = what exists. Operational Yield = what we&apos;ve processed.
                </p>
              </div>
            </div>

            {/* Campaign Status Breakdown */}
            <div style={{
              marginTop: '24px',
              padding: '20px',
              backgroundColor: NSD_COLORS.background,
              borderRadius: NSD_RADIUS.lg,
              boxShadow: NSD_SHADOWS.sm,
              border: `1px solid ${NSD_COLORS.border.light}`,
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: NSD_COLORS.text.primary,
              }}>
                Campaigns by Governance Status
              </h3>
              <div style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
              }}>
                {Object.entries(data.campaigns.byGovernanceStatus).map(([status, count]) => (
                  <div key={status} style={{
                    padding: '12px 16px',
                    backgroundColor: NSD_COLORS.surface,
                    borderRadius: NSD_RADIUS.md,
                    minWidth: '100px',
                  }}>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: NSD_COLORS.text.primary,
                    }}>
                      {count}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: NSD_COLORS.text.muted,
                      textTransform: 'capitalize',
                    }}>
                      {status.replace('_', ' ').toLowerCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
