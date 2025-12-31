'use client';

import type { BlockingReason, ThroughputBlockCode } from '../types/campaign';

const blockingReasonLabels: Record<BlockingReason, string> = {
  MISSING_HUMAN_APPROVAL: 'Missing Human Approval',
  PERSISTENCE_ERRORS: 'Persistence Errors',
  NO_LEADS_PERSISTED: 'No Leads Persisted',
  KILL_SWITCH_ENABLED: 'Kill Switch Enabled',
  SMARTLEAD_NOT_CONFIGURED: 'SmartLead Not Configured',
  INSUFFICIENT_CREDITS: 'Insufficient Credits',
};

const throughputBlockLabels: Record<ThroughputBlockCode, string> = {
  DAILY_LIMIT_EXCEEDED: 'Daily Limit Exceeded',
  HOURLY_LIMIT_EXCEEDED: 'Hourly Limit Exceeded',
  MAILBOX_LIMIT_EXCEEDED: 'Mailbox Limit Exceeded',
  CONFIG_INACTIVE: 'Configuration Inactive',
  NO_CONFIG_FOUND: 'No Configuration Found',
};

interface BlockingReasonsProps {
  reasons: BlockingReason[];
  throughputBlock?: ThroughputBlockCode;
}

export function BlockingReasons({ reasons, throughputBlock }: BlockingReasonsProps) {
  if (reasons.length === 0 && !throughputBlock) {
    return null;
  }

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#fef2f2',
        borderRadius: '8px',
        border: '1px solid #fecaca',
      }}
    >
      <h4
        style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 600,
          color: '#991b1b',
        }}
      >
        Blocking Reasons
      </h4>
      <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
        {reasons.map((reason) => (
          <li
            key={reason}
            style={{
              fontSize: '13px',
              color: '#b91c1c',
              marginBottom: '4px',
            }}
          >
            {blockingReasonLabels[reason]}
          </li>
        ))}
        {throughputBlock && (
          <li
            style={{
              fontSize: '13px',
              color: '#b91c1c',
              marginBottom: '4px',
            }}
          >
            {throughputBlockLabels[throughputBlock]}
          </li>
        )}
      </ul>
    </div>
  );
}
