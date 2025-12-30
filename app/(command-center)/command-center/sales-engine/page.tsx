'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Campaign, CampaignStatus } from '../../../sales-engine/types/campaign';
import { listCampaigns } from '../../../sales-engine/lib/api';
import { StatusBadge } from '../../../sales-engine/components';
import { Icon } from '../../../../design/components/Icon';
import { background, text, border, violet, magenta } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';

const statusFilters: { value: CampaignStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'RUNNABLE', label: 'Runnable' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function SalesEnginePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'ALL'>('ALL');

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true);
      setError(null);
      try {
        const status = statusFilter === 'ALL' ? undefined : statusFilter;
        const data = await listCampaigns(status);
        setCampaigns(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();
  }, [statusFilter]);

  return (
    <div style={{ padding: '48px 32px', fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: fontSize['4xl'],
              fontWeight: fontWeight.semibold,
              color: text.primary,
              fontFamily: fontFamily.display,
            }}>
              Sales Engine
            </h1>
            <p style={{
              margin: '12px 0 0 0',
              fontSize: fontSize.base,
              color: text.secondary,
              fontFamily: fontFamily.body,
            }}>
              Campaign Lifecycle Management
            </p>
          </div>
          <Link
            href="/command-center/sales-engine/campaigns/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              backgroundColor: magenta[500],
              color: text.inverse,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              fontFamily: fontFamily.body,
              borderRadius: '10px',
              textDecoration: 'none',
              transition: 'background-color 0.2s',
            }}
          >
            <Icon name="plus" size={16} color={text.inverse} />
            New Campaign
          </Link>
        </div>

        <div style={{ marginBottom: '32px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              style={{
                padding: '10px 20px',
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                fontFamily: fontFamily.body,
                backgroundColor: statusFilter === filter.value ? violet[500] : 'transparent',
                color: statusFilter === filter.value ? text.inverse : text.secondary,
                border: `1px solid ${statusFilter === filter.value ? violet[500] : border.default}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 48px' }}>
            <p style={{ color: text.muted, fontSize: fontSize.base, fontFamily: fontFamily.body }}>Loading campaigns...</p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#fef2f2',
            borderRadius: '12px',
            color: '#b91c1c',
            marginBottom: '24px',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: fontSize.sm,
            fontFamily: fontFamily.body,
          }}>
            <Icon name="alert" size={20} color="#b91c1c" />
            {error}
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 48px',
            backgroundColor: background.surface,
            borderRadius: '16px',
            border: `1px solid ${border.subtle}`,
          }}>
            <div style={{ marginBottom: '20px' }}>
              <Icon name="campaign" size={48} color={text.muted} />
            </div>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: fontSize.lg,
              color: text.secondary,
              fontFamily: fontFamily.body,
            }}>
              No campaigns found
            </p>
            <Link
              href="/command-center/sales-engine/campaigns/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                backgroundColor: magenta[500],
                color: text.inverse,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                fontFamily: fontFamily.body,
                borderRadius: '10px',
                textDecoration: 'none',
              }}
            >
              <Icon name="plus" size={16} color={text.inverse} />
              Create Your First Campaign
            </Link>
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {campaigns.map((campaign) => (
              <CampaignListItem key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}

        <div style={{
          marginTop: '48px',
          padding: '20px 24px',
          backgroundColor: background.muted,
          borderRadius: '12px',
          border: `1px solid ${border.subtle}`,
        }}>
          <p style={{
            margin: 0,
            fontSize: fontSize.xs,
            color: text.muted,
            fontFamily: fontFamily.body,
          }}>
            Sales Engine UI (M67) operates independently using M60 Campaign Management APIs. 
            No execution capability.
          </p>
        </div>
      </div>
    </div>
  );
}

function CampaignListItem({ campaign }: { campaign: Campaign }) {
  return (
    <Link
      href={`/command-center/sales-engine/campaigns/${campaign.id}`}
      style={{
        display: 'block',
        padding: '24px 28px',
        backgroundColor: background.surface,
        borderRadius: '14px',
        border: `1px solid ${border.subtle}`,
        textDecoration: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h3 style={{
              margin: 0,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: text.primary,
              fontFamily: fontFamily.display,
            }}>
              {campaign.name}
            </h3>
            <StatusBadge status={campaign.status} />
          </div>
          {campaign.description && (
            <p style={{
              margin: 0,
              fontSize: fontSize.sm,
              color: text.secondary,
              fontFamily: fontFamily.body,
            }}>
              {campaign.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {campaign.canEdit && <GovernanceIcon label="Edit" color="#10b981" />}
            {campaign.canSubmit && <GovernanceIcon label="Submit" color="#3b82f6" />}
            {campaign.canApprove && <GovernanceIcon label="Approve" color="#f59e0b" />}
            {campaign.isRunnable && <GovernanceIcon label="Runnable" color={violet[500]} />}
          </div>
          <Icon name="arrow-right" size={20} color={violet[500]} />
        </div>
      </div>
    </Link>
  );
}

function GovernanceIcon({ label, color }: { label: string; color: string }) {
  return (
    <span
      title={label}
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
      }}
    />
  );
}
