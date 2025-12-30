'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignDetail, ThroughputConfig, BlockingReason, ThroughputBlockCode } from '../../../types/campaign';
import { getCampaign, getCampaignThroughput } from '../../../lib/api';
import { background, text, border, violet, semantic } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

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
      <div style={{ minHeight: '100vh', backgroundColor: background.page, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontFamily.body }}>
        <p style={{ color: text.muted }}>Loading safety data...</p>
      </div>
    );
  }

  const blockingReasons = campaign?.readiness?.blocking_reasons || [];
  const isReady = campaign?.readiness?.is_ready || false;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: background.page, fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: violet[500], textDecoration: 'none', fontSize: fontSize.sm }}>
            ← Back to Campaign
          </Link>
        </div>

        <h1 style={{ margin: '0 0 16px 0', fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.heading }}>
          🛡️ Throughput & Safety
        </h1>

        {error && (
          <div style={{ padding: '16px', backgroundColor: semantic.danger.light, border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '24px', color: semantic.danger.dark }}>
            {error}
          </div>
        )}

        <div style={{
          padding: '20px',
          backgroundColor: semantic.warning.light,
          borderRadius: '12px',
          border: `2px solid ${semantic.warning.base}`,
          marginBottom: '32px',
        }}>
          <p style={{ margin: 0, color: semantic.warning.dark, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
            ⚠️ This is a read-only safety dashboard. Passing readiness does NOT execute the campaign. Execution is managed externally.
          </p>
        </div>

        <div style={{
          padding: '24px',
          backgroundColor: background.surface,
          borderRadius: '16px',
          border: `2px solid ${isReady ? semantic.success.base : semantic.danger.base}`,
          marginBottom: '32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: isReady ? semantic.success.light : semantic.danger.light,
              color: isReady ? semantic.success.dark : semantic.danger.dark,
              borderRadius: '50%',
              fontSize: '20px',
            }}>
              {isReady ? '✓' : '✗'}
            </span>
            <div>
              <h2 style={{ margin: 0, color: text.primary, fontSize: fontSize.xl }}>
                {isReady ? 'Ready (Informational Only)' : 'Not Ready'}
              </h2>
              <p style={{ margin: '4px 0 0 0', color: text.secondary, fontSize: fontSize.sm }}>
                {isReady ? 'All requirements met. Execution is external.' : 'Blocking issues must be resolved.'}
              </p>
            </div>
          </div>
        </div>

        {blockingReasons.length > 0 && (
          <div style={{
            padding: '24px',
            backgroundColor: background.surface,
            borderRadius: '16px',
            border: `1px solid ${border.default}`,
            marginBottom: '32px',
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: semantic.danger.base, fontSize: fontSize.lg }}>
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
                      backgroundColor: semantic.danger.light,
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <span style={{ color: semantic.danger.base, fontSize: '18px' }}>⛔</span>
                    <div>
                      <p style={{ margin: 0, color: semantic.danger.dark, fontWeight: fontWeight.semibold, fontFamily: 'monospace', fontSize: fontSize.sm }}>
                        {reason}
                      </p>
                      <p style={{ margin: '4px 0 0 0', color: semantic.danger.dark, fontSize: fontSize.sm }}>
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
            backgroundColor: background.surface,
            borderRadius: '16px',
            border: `1px solid ${border.default}`,
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: text.primary, fontSize: fontSize.lg }}>
              Throughput Configuration
            </h3>

            {throughput.is_blocked && throughput.block_reason && (
              <div style={{
                padding: '16px',
                backgroundColor: semantic.danger.light,
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #fecaca',
              }}>
                <p style={{ margin: 0, color: semantic.danger.dark, fontWeight: fontWeight.semibold, fontFamily: 'monospace', fontSize: fontSize.sm }}>
                  {throughput.block_reason}
                </p>
                <p style={{ margin: '4px 0 0 0', color: semantic.danger.dark, fontSize: fontSize.sm }}>
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

            <p style={{ margin: '20px 0 0 0', color: text.muted, fontSize: fontSize.sm }}>
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
      backgroundColor: background.muted,
      borderRadius: '12px',
      border: `1px solid ${isAtLimit ? semantic.danger.base : isNearLimit ? semantic.warning.base : border.default}`,
    }}>
      <p style={{ margin: 0, fontSize: fontSize.sm, color: text.muted }}>{label}</p>
      <p style={{ margin: '8px 0', fontSize: '24px', fontWeight: fontWeight.bold, color: isAtLimit ? semantic.danger.base : isNearLimit ? semantic.warning.base : text.primary }}>
        {current} / {max}
      </p>
      <div style={{ height: '6px', backgroundColor: border.default, borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(percentage, 100)}%`,
            height: '100%',
            backgroundColor: isAtLimit ? semantic.danger.base : isNearLimit ? semantic.warning.base : semantic.success.base,
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
}
