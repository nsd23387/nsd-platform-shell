'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail, ThroughputConfig, BlockingReason, ThroughputBlockCode } from '../../../types/campaign';
import { getCampaign, getCampaignThroughput } from '../../../lib/api';

const blockingReasonLabels: Record<BlockingReason, { label: string; description: string }> = {
  MISSING_HUMAN_APPROVAL: { label: 'Missing Human Approval', description: 'Campaign requires human approval before execution' },
  PERSISTENCE_ERRORS: { label: 'Persistence Errors', description: 'Data persistence issues detected' },
  NO_LEADS_PERSISTED: { label: 'No Leads Persisted', description: 'No leads have been saved for this campaign' },
  KILL_SWITCH_ENABLED: { label: 'Kill Switch Enabled', description: 'Global kill switch is active' },
  SMARTLEAD_NOT_CONFIGURED: { label: 'SmartLead Not Configured', description: 'SmartLead integration is not properly configured' },
  INSUFFICIENT_CREDITS: { label: 'Insufficient Credits', description: 'Not enough credits to execute campaign' },
};

const throughputBlockLabels: Record<ThroughputBlockCode, { label: string; description: string }> = {
  DAILY_LIMIT_EXCEEDED: { label: 'Daily Limit Exceeded', description: 'Daily sending limit has been reached' },
  HOURLY_LIMIT_EXCEEDED: { label: 'Hourly Limit Exceeded', description: 'Hourly sending limit has been reached' },
  MAILBOX_LIMIT_EXCEEDED: { label: 'Mailbox Limit Exceeded', description: 'Per-mailbox limit has been reached' },
  CONFIG_INACTIVE: { label: 'Configuration Inactive', description: 'Throughput configuration is disabled' },
  NO_CONFIG_FOUND: { label: 'No Configuration Found', description: 'No throughput configuration exists' },
};

export default function CampaignSafetyPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [throughput, setThroughput] = useState<ThroughputConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [campaignData, throughputData] = await Promise.all([
          getCampaign(campaignId),
          getCampaignThroughput(campaignId),
        ]);
        setCampaign(campaignData);
        setThroughput(throughputData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load safety data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9ca3af' }}>Loading safety data...</p>
      </div>
    );
  }

  const blockingReasons = campaign?.readiness?.blocking_reasons || [];
  const isReady = campaign?.readiness?.is_ready || false;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: '#e879f9', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Campaign
          </Link>
        </div>

        <h1 style={{ margin: '0 0 16px 0', fontSize: '28px', fontWeight: 600, color: '#fff' }}>
          🛡️ Throughput & Safety
        </h1>

        {error && (
          <div style={{ padding: '16px', backgroundColor: '#7f1d1d', borderRadius: '8px', marginBottom: '24px', color: '#fecaca' }}>
            {error}
          </div>
        )}

        <div style={{
          padding: '20px',
          backgroundColor: '#422006',
          borderRadius: '12px',
          border: '2px solid #f59e0b',
          marginBottom: '32px',
        }}>
          <p style={{ margin: 0, color: '#fcd34d', fontSize: '14px', fontWeight: 500 }}>
            ⚠️ This is a read-only safety dashboard. Passing readiness does NOT execute the campaign. Execution is managed externally.
          </p>
        </div>

        <div style={{
          padding: '24px',
          backgroundColor: '#1a1a1a',
          borderRadius: '16px',
          border: `2px solid ${isReady ? '#22c55e' : '#ef4444'}`,
          marginBottom: '32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: isReady ? '#166534' : '#991b1b',
              borderRadius: '50%',
              fontSize: '20px',
            }}>
              {isReady ? '✓' : '✗'}
            </span>
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>
                {isReady ? 'Ready (Informational Only)' : 'Not Ready'}
              </h2>
              <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
                {isReady ? 'All requirements met. Execution is external.' : 'Blocking issues must be resolved.'}
              </p>
            </div>
          </div>
        </div>

        {blockingReasons.length > 0 && (
          <div style={{
            padding: '24px',
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            border: '1px solid #333',
            marginBottom: '32px',
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#ef4444', fontSize: '18px' }}>
              M65 Blocking Reasons
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {blockingReasons.map((reason) => {
                const info = blockingReasonLabels[reason];
                return (
                  <div
                    key={reason}
                    style={{
                      padding: '16px',
                      backgroundColor: '#7f1d1d',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <span style={{ color: '#fecaca', fontSize: '18px' }}>⛔</span>
                    <div>
                      <p style={{ margin: 0, color: '#fecaca', fontWeight: 600, fontFamily: 'monospace', fontSize: '13px' }}>
                        {reason}
                      </p>
                      <p style={{ margin: '4px 0 0 0', color: '#fca5a5', fontSize: '14px' }}>
                        {info?.description || 'Unknown blocking reason'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {throughput && (
          <div style={{
            padding: '24px',
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            border: '1px solid #333',
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '18px' }}>
              Throughput Configuration
            </h3>

            {throughput.is_blocked && throughput.block_reason && (
              <div style={{
                padding: '16px',
                backgroundColor: '#7f1d1d',
                borderRadius: '8px',
                marginBottom: '20px',
              }}>
                <p style={{ margin: 0, color: '#fecaca', fontWeight: 600, fontFamily: 'monospace', fontSize: '13px' }}>
                  {throughput.block_reason}
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#fca5a5', fontSize: '14px' }}>
                  {throughputBlockLabels[throughput.block_reason]?.description || 'Throughput is blocked'}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <LimitCard
                label="Daily Limit"
                current={throughput.current_daily_usage}
                max={throughput.daily_limit}
              />
              <LimitCard
                label="Hourly Limit"
                current={throughput.current_hourly_usage}
                max={throughput.hourly_limit}
              />
              <LimitCard
                label="Mailbox Limit"
                current={0}
                max={throughput.mailbox_limit}
              />
            </div>

            <p style={{ margin: '20px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
              Last reset: {new Date(throughput.last_reset || Date.now()).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LimitCard({ label, current, max }: { label: string; current: number; max: number }) {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage >= 100;

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#0f0f0f',
      borderRadius: '12px',
      border: `1px solid ${isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#333'}`,
    }}>
      <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>{label}</p>
      <p style={{ margin: '8px 0', fontSize: '24px', fontWeight: 700, color: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#fff' }}>
        {current} / {max}
      </p>
      <div style={{ height: '6px', backgroundColor: '#333', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(percentage, 100)}%`,
            height: '100%',
            backgroundColor: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#22c55e',
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
}
