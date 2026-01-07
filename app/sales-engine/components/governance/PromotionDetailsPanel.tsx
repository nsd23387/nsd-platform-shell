/**
 * PromotionDetailsPanel Component
 * 
 * Displays read-only promotion details for a lead.
 * 
 * CRITICAL SEMANTIC DISTINCTION:
 * - Contacts and leads are distinct; leads are conditionally promoted.
 * - Promotion requires ICP fit AND real (non-placeholder) email.
 * - This panel displays a "Promotion Snapshot" - the rationale captured
 *   at the moment of promotion.
 * - No editing, recalculation, or scoring controls are provided.
 * - Tier C/D contacts are never leads and should never reach this panel.
 * 
 * Backend truths (authoritative):
 * - Organizations are global; campaign linkage via organization.sourced
 * - Contacts are global; campaign linkage via contact.discovered
 * - Contacts are evaluated deterministically
 * - Leads exist only when contacts are promoted
 * - Events are authoritative; DB rows are snapshots
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { PromotionDetails, PromotionTier } from '../../types/campaign';

export interface PromotionDetailsPanelProps {
  /** Promotion details from backend (read-only snapshot) */
  promotion: PromotionDetails;
  /** Whether the panel is in a compact mode */
  compact?: boolean;
}

/**
 * Get styling for promotion tier badge.
 */
function getTierStyle(tier: PromotionTier): { bg: string; text: string; border: string } {
  const styles: Record<PromotionTier, { bg: string; text: string; border: string }> = {
    A: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
    B: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    // Tier C/D should never appear in lead views, but included for completeness
    C: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
    D: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' },
  };
  return styles[tier] || styles.D;
}

/**
 * Get tier description for display.
 */
function getTierDescription(tier: PromotionTier): string {
  const descriptions: Record<PromotionTier, string> = {
    A: 'High-priority lead - Strong ICP fit',
    B: 'Standard lead - Good ICP fit',
    C: 'Not promoted - Partial ICP match',
    D: 'Not promoted - Does not meet criteria',
  };
  return descriptions[tier] || 'Unknown tier';
}

/**
 * PromotionDetailsPanel - Read-only display of lead promotion rationale.
 * 
 * This component displays:
 * - promotionTier (A/B for leads)
 * - promotionScore (0-100)
 * - promotionReasons[] (array of explanation strings)
 * 
 * Rules:
 * - Display only if promotion details exist
 * - No editing allowed
 * - No recalculation
 * - Clearly labeled as "Promotion Snapshot"
 */
export function PromotionDetailsPanel({ 
  promotion, 
  compact = false 
}: PromotionDetailsPanelProps) {
  const tierStyle = getTierStyle(promotion.promotionTier);
  
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '12px 16px' : '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4
            style={{
              margin: 0,
              fontSize: compact ? '13px' : '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            Promotion Snapshot
          </h4>
          <span
            style={{
              fontSize: '11px',
              color: NSD_COLORS.text.muted,
              fontStyle: 'italic',
            }}
          >
            (Read-only)
          </span>
        </div>
        
        {/* Tier Badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: tierStyle.bg,
            color: tierStyle.text,
            border: `1px solid ${tierStyle.border}`,
            borderRadius: NSD_RADIUS.sm,
          }}
        >
          Tier {promotion.promotionTier}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: compact ? '12px 16px' : '16px 20px' }}>
        {/* Info notice about read-only nature */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: NSD_COLORS.semantic.info.bg,
            borderRadius: NSD_RADIUS.md,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            border: `1px solid ${NSD_COLORS.semantic.info.border}`,
          }}
        >
          <Icon name="info" size={14} color={NSD_COLORS.semantic.info.text} />
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: NSD_COLORS.semantic.info.text,
              lineHeight: 1.5,
            }}
          >
            This is a snapshot of the promotion evaluation at the time of lead creation.
            Contacts and leads are distinct; leads are conditionally promoted based on ICP fit and email validity.
          </p>
        </div>

        {/* Tier and Score Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* Tier Detail */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: NSD_COLORS.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                marginBottom: '6px',
              }}
            >
              Promotion Tier
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                  color: tierStyle.text,
                }}
              >
                {promotion.promotionTier}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: NSD_COLORS.text.secondary,
                }}
              >
                {getTierDescription(promotion.promotionTier)}
              </span>
            </div>
          </div>

          {/* Score */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: NSD_COLORS.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                marginBottom: '6px',
              }}
            >
              Promotion Score
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                  color: NSD_COLORS.primary,
                }}
              >
                {promotion.promotionScore}
              </span>
              <span
                style={{
                  fontSize: '14px',
                  color: NSD_COLORS.text.muted,
                }}
              >
                / 100
              </span>
            </div>
          </div>
        </div>

        {/* Promotion Reasons */}
        {promotion.promotionReasons.length > 0 && (
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: NSD_COLORS.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                marginBottom: '8px',
              }}
            >
              Promotion Reasons
            </span>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {promotion.promotionReasons.map((reason, index) => (
                <li
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: NSD_COLORS.surface,
                    borderRadius: NSD_RADIUS.sm,
                    fontSize: '13px',
                    color: NSD_COLORS.text.primary,
                  }}
                >
                  <Icon name="check" size={14} color={NSD_COLORS.semantic.positive.text} />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Promoted At timestamp */}
        {promotion.promotedAt && (
          <p
            style={{
              margin: '16px 0 0 0',
              fontSize: '12px',
              color: NSD_COLORS.text.muted,
            }}
          >
            Evaluated: {new Date(promotion.promotedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
