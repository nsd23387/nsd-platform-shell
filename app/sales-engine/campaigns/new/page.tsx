'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CampaignForm } from '../../components';
import { createCampaign } from '../../lib/api';

export default function NewCampaignPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: { name: string; description?: string }) {
    setIsLoading(true);
    setError(null);
    try {
      const campaign = await createCampaign(data);
      router.push(`/sales-engine/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '32px',
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/sales-engine"
            style={{
              fontSize: '14px',
              color: '#4f46e5',
              textDecoration: 'none',
            }}
          >
            ← Back to Campaigns
          </Link>
        </div>

        <div
          style={{
            padding: '32px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600, color: '#111827' }}>
            Create New Campaign
          </h1>
          <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280' }}>
            New campaigns are created in DRAFT state. You can edit and submit for review later.
          </p>

          {error && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                marginBottom: '24px',
                color: '#b91c1c',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <CampaignForm
            onSubmit={handleSubmit}
            onCancel={() => router.push('/sales-engine')}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
