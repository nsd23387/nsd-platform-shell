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
        borderRadius: NSD_RADIUS.xl,
        padding: NSD_SPACING.lg,
        boxShadow: NSD_SHADOWS.card,
        transition: NSD_TRANSITIONS.default,
        minWidth: '180px',
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
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: NSD_SPACING.md }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: NSD_RADIUS.lg,
            backgroundColor: styles.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={22} color={styles.iconColor} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              ...NSD_TYPOGRAPHY.statLabel,
              color: NSD_COLORS.text.muted,
              marginBottom: NSD_SPACING.xs,
            }}
          >
            {label}
          </div>
          <span
            style={{
              ...NSD_TYPOGRAPHY.statNumber,
              color: styles.valueColor,
              display: 'block',
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
        borderRadius: NSD_RADIUS.xl,
        padding: NSD_SPACING.lg,
        boxShadow: NSD_SHADOWS.card,
        transition: NSD_TRANSITIONS.default,
        flex: 1,
        minWidth: '280px',
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
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: NSD_SPACING.md }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: NSD_RADIUS.lg,
            backgroundColor: isHighUsage ? NSD_COLORS.semantic.attention.bg : NSD_COLORS.violet.light,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon 
            name="chart" 
            size={22} 
            color={isHighUsage ? NSD_COLORS.semantic.attention.text : NSD_COLORS.violet.dark} 
          />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              ...NSD_TYPOGRAPHY.statLabel,
              color: NSD_COLORS.text.muted,
              marginBottom: NSD_SPACING.sm,
            }}
          >
            Daily Capacity
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: NSD_SPACING.md }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '10px',
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
                fontSize: '18px',
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
        borderRadius: NSD_RADIUS.xl,
        padding: NSD_SPACING.lg,
        boxShadow: NSD_SHADOWS.card,
        minWidth: wide ? '280px' : '180px',
        flex: wide ? 1 : 'none',
        overflow: 'hidden',
        position: 'relative',
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: NSD_SPACING.md }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            backgroundColor: NSD_COLORS.border.light,
            borderRadius: NSD_RADIUS.lg,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: '80px',
              height: '11px',
              backgroundColor: NSD_COLORS.border.light,
              borderRadius: NSD_RADIUS.sm,
              marginBottom: NSD_SPACING.sm,
            }}
          />
          <div
            style={{
              width: wide ? '100%' : '60px',
              height: wide ? '10px' : '40px',
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
          gap: NSD_SPACING.lg,
          marginBottom: NSD_SPACING.xl,
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
        gap: NSD_SPACING.lg,
        marginBottom: NSD_SPACING.xl,
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
