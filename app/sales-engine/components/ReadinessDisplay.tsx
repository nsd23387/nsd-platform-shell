'use client';

import type { CampaignDetail, ThroughputConfig } from '../types/campaign';
import { BlockingReasons } from './BlockingReasons';

interface ReadinessDisplayProps {
  campaign: CampaignDetail;
  throughput?: ThroughputConfig;
}

export function ReadinessDisplay({ campaign, throughput }: ReadinessDisplayProps) {
  const readiness = campaign.readiness;
  const hasBlockingReasons = readiness && readiness.blocking_reasons.length > 0;
  const hasThroughputBlock = throughput?.is_blocked;

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <h4
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
        }}
      >
        Execution Readiness
      </h4>

      <div
        style={{
          padding: '16px',
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid #fcd34d',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#92400e',
            fontWeight: 500,
          }}
        >
          Passing readiness does not execute the campaign. Execution is managed externally.
        </p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: readiness?.is_ready ? '#d1fae5' : '#fef2f2',
              fontSize: '14px',
            }}
          >
            {readiness?.is_ready ? '✓' : '✗'}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
            {readiness?.is_ready ? 'Ready (Informational Only)' : 'Not Ready'}
          </span>
        </div>

        {campaign.isRunnable && (
          <p style={{ margin: '0 0 0 32px', fontSize: '13px', color: '#6b7280' }}>
            Campaign is in RUNNABLE state.
          </p>
        )}
      </div>

      {(hasBlockingReasons || hasThroughputBlock) && (
        <BlockingReasons
          reasons={readiness?.blocking_reasons || []}
          throughputBlock={throughput?.block_reason}
        />
      )}

      {throughput && (
        <div style={{ marginTop: '16px' }}>
          <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
            Throughput Constraints
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Daily</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                {throughput.current_daily_usage} / {throughput.daily_limit}
              </p>
            </div>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Hourly</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                {throughput.current_hourly_usage} / {throughput.hourly_limit}
              </p>
            </div>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Mailbox Limit</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                {throughput.mailbox_limit}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
