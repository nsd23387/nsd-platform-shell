'use client';

import { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

interface CampaignListHeaderProps {
  activeCampaigns: number;
  needsAttentionCount: number;
  dailyUsed: number;
  dailyLimit: number;
  isLoading?: boolean;
}

export function CampaignListHeader({
  activeCampaigns,
  needsAttentionCount,
  dailyUsed,
  dailyLimit,
  isLoading = false,
}: CampaignListHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const usagePercent = dailyLimit > 0 ? Math.min((dailyUsed / dailyLimit) * 100, 100) : 0;
  const isHighUsage = usagePercent > 80;

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.border.light}`,
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: `2px solid ${NSD_COLORS.border.default}`,
              borderTopColor: NSD_COLORS.secondary,
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: '13px', color: NSD_COLORS.text.muted }}>Loading summary...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        marginBottom: '24px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: NSD_COLORS.text.primary,
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            Campaign Summary
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                backgroundColor: NSD_COLORS.semantic.active.bg,
                color: NSD_COLORS.semantic.active.text,
                borderRadius: NSD_RADIUS.full,
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {activeCampaigns} Active
            </span>
            {needsAttentionCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: NSD_COLORS.semantic.attention.bg,
                  color: NSD_COLORS.semantic.attention.text,
                  borderRadius: NSD_RADIUS.full,
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {needsAttentionCount} Needs Attention
              </span>
            )}
          </div>
        </div>
        <span
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
            transition: 'transform 0.2s ease',
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        >
          ▼
        </span>
      </button>

      {!isCollapsed && (
        <div
          style={{
            padding: '0 20px 20px',
            borderTop: `1px solid ${NSD_COLORS.border.light}`,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              paddingTop: '16px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: NSD_COLORS.text.muted,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Active Campaigns
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: NSD_COLORS.semantic.active.text,
                }}
              >
                {activeCampaigns}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: NSD_COLORS.text.muted,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Needs Attention
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: needsAttentionCount > 0 ? NSD_COLORS.semantic.attention.text : NSD_COLORS.text.muted,
                }}
              >
                {needsAttentionCount}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: NSD_COLORS.text.muted,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Daily Capacity
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    flex: 1,
                    height: '8px',
                    backgroundColor: NSD_COLORS.border.light,
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${usagePercent}%`,
                      height: '100%',
                      backgroundColor: isHighUsage
                        ? NSD_COLORS.semantic.attention.text
                        : NSD_COLORS.secondary,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isHighUsage ? NSD_COLORS.semantic.attention.text : NSD_COLORS.text.secondary,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dailyUsed} / {dailyLimit}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignListHeader;
