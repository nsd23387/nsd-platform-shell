'use client';

/**
 * ExecutionHealthBanner Component
 * 
 * Top-level banner that summarizes the current state of execution in plain English.
 * This is the PRIMARY execution status indicator for users.
 * 
 * DESIGN PRINCIPLES:
 * - Informational by default, not alarming
 * - Uses real-time execution status only (DATA AUTHORITY)
 * - Must never rely on raw ODS interpretation
 * - Coexists with ENM (ENM remains the narrative source)
 * 
 * BANNER STATES:
 * | Condition                                    | Type    | Message                                              |
 * |----------------------------------------------|---------|------------------------------------------------------|
 * | status === 'running'                         | info    | "Campaign is actively running. Live counts shown."   |
 * | contacts > 0 AND leads = 0 AND has alert     | warning | "Contacts sourced but need email discovery..."       |
 * | status === 'completed'                       | success | "Campaign completed successfully."                   |
 * | status === 'failed'                          | error   | "Campaign stopped during {stage}. See details below."|
 * | partial success                              | warning | "Campaign completed with limitations (see details)." |
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { RealTimeExecutionStatus } from '../../lib/api';

export interface ExecutionHealthBannerProps {
  realTimeStatus: RealTimeExecutionStatus | null;
  /** Optional: Whether polling is active */
  isPolling?: boolean;
}

type BannerType = 'info' | 'success' | 'warning' | 'error' | 'idle';

interface BannerState {
  type: BannerType;
  icon: 'info' | 'check' | 'warning' | 'clock';
  message: string;
  subMessage?: string;
}

/**
 * Derive banner state from real-time execution status.
 * This is the SINGLE SOURCE OF TRUTH for execution health display.
 */
function deriveBannerState(status: RealTimeExecutionStatus | null): BannerState {
  if (!status) {
    return {
      type: 'idle',
      icon: 'clock',
      message: 'No execution data available.',
      subMessage: 'Run the campaign to see execution progress.',
    };
  }

  const { latestRun, funnel, alerts, stages } = status;
  const runStatus = latestRun?.status?.toLowerCase() || 'idle';

  // RUNNING STATE
  if (runStatus === 'running' || runStatus === 'in_progress' || runStatus === 'queued') {
    const totalProcessed = funnel.organizations.total + funnel.contacts.total + funnel.leads.total;
    const currentStage = latestRun?.stage || stages.find(s => s.status === 'running')?.stage;
    
    return {
      type: 'info',
      icon: 'info',
      message: 'Campaign is actively running. Live counts shown.',
      subMessage: currentStage 
        ? `Currently: ${formatStageName(currentStage)} (${totalProcessed.toLocaleString()} items processed)`
        : totalProcessed > 0 
          ? `${totalProcessed.toLocaleString()} items processed so far.`
          : undefined,
    };
  }

  // COMPLETED STATE
  if (runStatus === 'completed') {
    const hasPartialSuccess = alerts.some(a => a.type === 'warning');
    
    if (hasPartialSuccess) {
      return {
        type: 'warning',
        icon: 'warning',
        message: 'Campaign completed with limitations.',
        subMessage: 'Some stages may have completed with warnings. See details below.',
      };
    }

    return {
      type: 'success',
      icon: 'check',
      message: 'Campaign completed successfully.',
      subMessage: `${funnel.organizations.total.toLocaleString()} orgs, ${funnel.contacts.total.toLocaleString()} contacts, ${funnel.leads.total.toLocaleString()} leads.`,
    };
  }

  // FAILED STATE
  if (runStatus === 'failed') {
    const failedStage = latestRun?.stage || stages.find(s => s.status === 'error')?.stage;
    const reason = latestRun?.terminationReason || latestRun?.errorMessage;
    
    return {
      type: 'error',
      icon: 'warning',
      message: failedStage 
        ? `Campaign stopped during ${formatStageName(failedStage)}.`
        : 'Campaign execution failed.',
      subMessage: reason || 'See details below for more information.',
    };
  }

  // CONTACTS WITHOUT LEADS WARNING
  if (funnel.contacts.total > 0 && funnel.leads.total === 0) {
    const hasRelevantAlert = alerts.some(a => 
      a.message.toLowerCase().includes('email') || 
      a.message.toLowerCase().includes('contact')
    );
    
    if (hasRelevantAlert || runStatus === 'running') {
      return {
        type: 'warning',
        icon: 'info',
        message: 'Contacts sourced but need email discovery before leads can be created.',
        subMessage: `${funnel.contacts.total.toLocaleString()} contacts discovered so far.`,
      };
    }
  }

  // IDLE STATE (default)
  if (latestRun === null) {
    return {
      type: 'idle',
      icon: 'clock',
      message: 'No recent execution.',
      subMessage: 'Run the campaign to begin sourcing.',
    };
  }

  // TERMINAL BUT UNKNOWN STATE
  return {
    type: 'idle',
    icon: 'clock',
    message: 'Execution idle.',
    subMessage: 'Last run status: ' + runStatus,
  };
}

/**
 * Format stage name for display.
 */
function formatStageName(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get banner colors based on type.
 */
function getBannerColors(type: BannerType): { bg: string; text: string; border: string } {
  switch (type) {
    case 'info':
      return NSD_COLORS.semantic.info;
    case 'success':
      return NSD_COLORS.semantic.positive;
    case 'warning':
      return NSD_COLORS.semantic.attention;
    case 'error':
      return NSD_COLORS.semantic.critical;
    case 'idle':
    default:
      return NSD_COLORS.semantic.muted;
  }
}

export function ExecutionHealthBanner({ 
  realTimeStatus,
  isPolling = false,
}: ExecutionHealthBannerProps) {
  const bannerState = deriveBannerState(realTimeStatus);
  const colors = getBannerColors(bannerState.type);

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${colors.border}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div
        style={{
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        <Icon name={bannerState.icon} size={20} color={colors.text} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: colors.text,
            lineHeight: 1.4,
          }}
        >
          {bannerState.message}
        </p>
        {bannerState.subMessage && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              fontWeight: 400,
              color: colors.text,
              opacity: 0.85,
              lineHeight: 1.4,
            }}
          >
            {bannerState.subMessage}
          </p>
        )}
      </div>

      {/* Polling indicator */}
      {isPolling && bannerState.type === 'info' && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            backgroundColor: `${colors.text}15`,
            borderRadius: NSD_RADIUS.sm,
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: colors.text,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: colors.text,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Live
          </span>
        </div>
      )}

      {/* Inline keyframes for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default ExecutionHealthBanner;
