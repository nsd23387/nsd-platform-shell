'use client';

/**
 * ContactFunnelCard Component
 * 
 * Primary contact pipeline visualization showing the 4-state funnel:
 * - Pending (Awaiting Scoring)
 * - Processing (Scoring/Enriching)
 * - Ready (Ready for Promotion)
 * - Blocked (Cannot become leads)
 * 
 * MUST HAVE component for contact pipeline visibility.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface ContactStats {
  total: number;
  pending: number;
  processing: number;
  ready: number;
  blocked: number;
  unavailable: number;
  leadsCreated: number;
  readyWithoutLead: number;
}

export interface ContactFunnelCardProps {
  campaignId: string;
  onPromoteClick?: () => void;
  /** Polling interval in ms (default: 10000) */
  pollInterval?: number;
}

// NSD Brand-Aligned Colors (NO red/yellow/green)
const STAGE_CONFIG = [
  { 
    key: 'pending', 
    label: 'Awaiting Scoring', 
    color: NSD_COLORS.text.muted,  // Gray - idle/pending
    description: 'Contacts discovered, waiting to be scored',
  },
  { 
    key: 'processing', 
    label: 'Scoring / Enriching', 
    color: NSD_COLORS.primary,  // Deep navy - active processing
    description: 'Being evaluated for ICP fit and email discovery',
  },
  { 
    key: 'ready', 
    label: 'Ready for Promotion', 
    color: NSD_COLORS.cta,  // Magenta - ready/positive
    description: 'Have usable email, can be promoted to leads',
  },
  { 
    key: 'blocked', 
    label: 'Blocked', 
    color: NSD_COLORS.secondary,  // Purple - blocked (NOT red)
    description: 'Cannot become leads (no email, low score, etc.)',
  },
];

export function ContactFunnelCard({ 
  campaignId, 
  onPromoteClick,
  pollInterval = 10000,
}: ContactFunnelCardProps) {
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/contact-stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('[ContactFunnelCard] Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchStats, pollInterval);
    return () => clearInterval(interval);
  }, [fetchStats, pollInterval]);

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.surface,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.border.light}`,
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: NSD_COLORS.text.muted }}>
          <Icon name="clock" size={16} color={NSD_COLORS.text.muted} />
          <span>Loading contact pipeline...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.semantic.critical.bg,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: NSD_COLORS.semantic.critical.text }}>
          <Icon name="warning" size={16} color={NSD_COLORS.semantic.critical.text} />
          <span>Failed to load contact stats</span>
        </div>
      </div>
    );
  }

  const stages = STAGE_CONFIG.map(stage => ({
    ...stage,
    count: stats[stage.key as keyof ContactStats] as number || 0,
  }));

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.text.primary,
            }}
          >
            Contact Pipeline
          </h3>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: NSD_COLORS.text.muted,
            }}
          >
            Discovered: {stats.total.toLocaleString()} contacts
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            backgroundColor: `${NSD_COLORS.primary}10`,
            borderRadius: NSD_RADIUS.sm,
          }}
        >
          <Icon name="users" size={14} color={NSD_COLORS.primary} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: NSD_COLORS.primary }}>
            {stats.leadsCreated} leads
          </span>
        </div>
      </div>

      {/* Funnel stages */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stages.map((stage) => (
            <div
              key={stage.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: stage.color,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: NSD_COLORS.text.primary,
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  color: stage.count > 0 ? NSD_COLORS.text.primary : NSD_COLORS.text.muted,
                }}
              >
                {stage.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ready to promote section */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: stats.readyWithoutLead > 0 
            ? `${NSD_COLORS.cta}10`  // Light magenta tint
            : NSD_COLORS.background,
        }}
      >
        {stats.readyWithoutLead > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="check" size={16} color={NSD_COLORS.cta} />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: NSD_COLORS.cta,  // Magenta
                }}
              >
                {stats.readyWithoutLead.toLocaleString()} ready for promotion
              </span>
            </div>
            {onPromoteClick && (
              <button
                onClick={onPromoteClick}
                style={{
                  padding: '8px 16px',
                  backgroundColor: NSD_COLORS.cta,  // Magenta CTA button
                  color: NSD_COLORS.text.inverse,
                  border: 'none',
                  borderRadius: NSD_RADIUS.md,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Promote to Leads
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px',
              backgroundColor: NSD_COLORS.semantic.muted.bg,
              borderRadius: NSD_RADIUS.md,
              color: NSD_COLORS.text.muted,
            }}
          >
            <Icon name="info" size={14} color={NSD_COLORS.text.muted} />
            <span style={{ fontSize: '13px' }}>
              No contacts ready for promotion
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContactFunnelCard;
