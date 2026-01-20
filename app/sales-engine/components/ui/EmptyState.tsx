'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SPACING, NSD_GRADIENTS, NSD_SHADOWS } from '../../lib/design-tokens';
import { Button } from './Button';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

function NeonSignIcon() {
  return (
    <div
      style={{
        width: '120px',
        height: '120px',
        margin: '0 auto',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0 0 8px ${NSD_COLORS.magenta.base}40)`,
        }}
      >
        <rect
          x="10"
          y="20"
          width="60"
          height="40"
          rx="4"
          stroke="url(#neonGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 4px ${NSD_COLORS.magenta.base}60)`,
          }}
        />
        <path
          d="M25 32V48M25 32L30 40L25 48M38 32H48M38 40H45M38 48H48M55 32V48"
          stroke="url(#neonGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 0 3px ${NSD_COLORS.violet.base}60)`,
          }}
        />
        <line
          x1="30"
          y1="8"
          x2="30"
          y2="20"
          stroke={NSD_COLORS.border.default}
          strokeWidth="2"
        />
        <line
          x1="50"
          y1="8"
          x2="50"
          y2="20"
          stroke={NSD_COLORS.border.default}
          strokeWidth="2"
        />
        <line
          x1="20"
          y1="8"
          x2="60"
          y2="8"
          stroke={NSD_COLORS.border.default}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="neonGradient" x1="10" y1="20" x2="70" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={NSD_COLORS.magenta.base} />
            <stop offset="50%" stopColor={NSD_COLORS.magenta.dark} />
            <stop offset="100%" stopColor={NSD_COLORS.violet.base} />
          </linearGradient>
        </defs>
      </svg>
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `radial-gradient(circle, ${NSD_COLORS.magenta.base}08 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
}: EmptyStateProps) {
  const actionButton = actionLabel && (
    <Button variant="cta" icon="plus" onClick={onAction}>
      {actionLabel}
    </Button>
  );

  return (
    <div
      style={{
        textAlign: 'center',
        padding: `${NSD_SPACING.xxxl} ${NSD_SPACING.xxl}`,
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.xl,
        border: `1px solid ${NSD_COLORS.border.light}`,
        boxShadow: NSD_SHADOWS.card,
      }}
    >
      {icon || <NeonSignIcon />}
      
      <h3
        style={{
          ...NSD_TYPOGRAPHY.heading2,
          color: NSD_COLORS.text.primary,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          marginTop: NSD_SPACING.lg,
          marginBottom: NSD_SPACING.sm,
        }}
      >
        {title}
      </h3>
      
      <p
        style={{
          ...NSD_TYPOGRAPHY.body,
          color: NSD_COLORS.text.secondary,
          maxWidth: '400px',
          margin: `0 auto ${NSD_SPACING.lg}`,
        }}
      >
        {description}
      </p>

      {actionHref ? (
        <Link href={actionHref} style={{ textDecoration: 'none' }}>
          {actionButton}
        </Link>
      ) : (
        actionButton
      )}
    </div>
  );
}

export default EmptyState;
