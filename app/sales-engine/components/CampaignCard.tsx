'use client';

import Link from 'next/link';
import type { Campaign } from '../types/campaign';
import { StatusBadge } from './StatusBadge';
import { NSD_COLORS } from '../lib/design-tokens';

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Link
      href={`/sales-engine/campaigns/${campaign.id}`}
      style={{
        display: 'block',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        textDecoration: 'none',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {campaign.name}
        </h3>
        <StatusBadge status={campaign.status} />
      </div>

      {campaign.description && (
        <p
          style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: 1.5,
          }}
        >
          {campaign.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
        <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
        <span>Updated: {new Date(campaign.updated_at).toLocaleDateString()}</span>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {campaign.canEdit && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              borderRadius: '4px',
            }}
          >
            Editable
          </span>
        )}
        {campaign.canSubmit && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: NSD_COLORS.semantic.attention.bg,
              color: NSD_COLORS.semantic.attention.text,
              borderRadius: '4px',
            }}
          >
            Can Submit
          </span>
        )}
        {campaign.canApprove && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: NSD_COLORS.semantic.positive.bg,
              color: NSD_COLORS.semantic.positive.text,
              borderRadius: '4px',
            }}
          >
            Can Approve
          </span>
        )}
      </div>
    </Link>
  );
}
