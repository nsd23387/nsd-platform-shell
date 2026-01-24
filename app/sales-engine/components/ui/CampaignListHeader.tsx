'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS, NSD_GRADIENTS, NSD_TRANSITIONS, NSD_SPACING } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface CampaignListHeaderProps {
  activeCampaigns: number;
  needsAttentionCount: number;
  dailyUsed: number;
  dailyLimit: number;
  isLoading?: boolean;
}

function StatCard({
  label,
  value,
  variant = 'default',
  icon,
}: {
  label: string;
  value: number | string;
  variant?: 'default' | 'attention' | 'active';
  icon: 'runs' | 'warning' | 'chart';
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'attention':
        return {
          iconBg: NSD_COLORS.semantic.attention.bg,
          iconColor: NSD_COLORS.semantic.attention.text,
          valueColor: NSD_COLORS.semantic.attention.text,
          borderAccent: NSD_COLORS.magenta.base,
        };
      case 'active':
        return {
          iconBg: NSD_COLORS.semantic.active.bg,
          iconColor: NSD_COLORS.semantic.active.text,
          valueColor: NSD_COLORS.semantic.active.text,
          borderAccent: NSD_COLORS.indigo.base,
        };
      default:
        return {
          iconBg: NSD_COLORS.violet.light,
          iconColor: NSD_COLORS.violet.dark,
          valueColor: NSD_COLORS.text.primary,
          borderAccent: NSD_COLORS.violet.base,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: NSD_RADIUS.lg,
        padding: '16px',
        boxShadow: NSD_SHADOWS.card,
        transition: NSD_TRANSITIONS.default,
        flex: '1 1 140px',
        minWidth: '140px',
        border: `1px solid ${NSD_COLORS.border.light}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${styles.borderAccent}, transparent)`,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: NSD_RADIUS.md,
            backgroundColor: styles.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={18} color={styles.iconColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: NSD_COLORS.text.muted,
              marginBottom: '4px',
            }}
          >
            {label}
          </div>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: styles.valueColor,
              display: 'block',
              lineHeight: 1,
            }}
          >
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

function CapacityCard({
  used,
  limit,
  isLoading,
}: {
  used: number;
  limit: number;
  isLoading?: boolean;
}) {
  const usagePercent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isHighUsage = usagePercent > 80;

  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: NSD_RADIUS.lg,
        padding: '16px',
        boxShadow: NSD_SHADOWS.card,
        transition: NSD_TRANSITIONS.default,
        flex: '1 1 100%',
        minWidth: '200px',
        border: `1px solid ${NSD_COLORS.border.light}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: NSD_GRADIENTS.brandHorizontal,
          opacity: 0.6,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: NSD_RADIUS.md,
            backgroundColor: isHighUsage ? NSD_COLORS.semantic.attention.bg : NSD_COLORS.violet.light,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon 
            name="chart" 
            size={18} 
            color={isHighUsage ? NSD_COLORS.semantic.attention.text : NSD_COLORS.violet.dark} 
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: NSD_COLORS.text.muted,
              marginBottom: '8px',
            }}
          >
            Daily Capacity
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 100px', minWidth: '100px' }}>
              <div
                style={{
                  height: '8px',
                  backgroundColor: NSD_COLORS.border.light,
                  borderRadius: NSD_RADIUS.full,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: isLoading ? '0%' : `${usagePercent}%`,
                    height: '100%',
                    background: isHighUsage 
                      ? NSD_GRADIENTS.ctaButton 
                      : NSD_GRADIENTS.brand,
                    borderRadius: NSD_RADIUS.full,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: isHighUsage ? NSD_COLORS.semantic.attention.text : NSD_COLORS.text.primary,
                whiteSpace: 'nowrap',
                fontFamily: NSD_TYPOGRAPHY.fontBody,
              }}
            >
              {used} / {limit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({ wide = false }: { wide?: boolean }) {
  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: NSD_RADIUS.lg,
        padding: '16px',
        boxShadow: NSD_SHADOWS.card,
        flex: wide ? '1 1 100%' : '1 1 140px',
        minWidth: wide ? '200px' : '140px',
        overflow: 'hidden',
        position: 'relative',
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: NSD_COLORS.border.light,
            borderRadius: NSD_RADIUS.md,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: '70px',
              height: '11px',
              backgroundColor: NSD_COLORS.border.light,
              borderRadius: NSD_RADIUS.sm,
              marginBottom: '8px',
            }}
          />
          <div
            style={{
              width: wide ? '100%' : '50px',
              height: wide ? '8px' : '24px',
              backgroundColor: NSD_COLORS.border.light,
              borderRadius: NSD_RADIUS.md,
            }}
          />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: NSD_GRADIENTS.shimmer,
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

export function CampaignListHeader({
  activeCampaigns,
  needsAttentionCount,
  dailyUsed,
  dailyLimit,
  isLoading = false,
}: CampaignListHeaderProps) {

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard wide />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}
    >
      <StatCard
        label="Active Campaigns"
        value={activeCampaigns}
        variant="active"
        icon="runs"
      />
      
      <StatCard
        label="Needs Attention"
        value={needsAttentionCount}
        variant={needsAttentionCount > 0 ? 'attention' : 'default'}
        icon="warning"
      />
      
      <CapacityCard
        used={dailyUsed}
        limit={dailyLimit}
        isLoading={isLoading}
      />
    </div>
  );
}

export default CampaignListHeader;
