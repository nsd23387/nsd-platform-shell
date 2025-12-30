'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignVariant } from '../../../types/campaign';
import { getCampaignVariants } from '../../../lib/api';

export default function CampaignVariantsPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [variants, setVariants] = useState<CampaignVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCampaignVariants(campaignId);
        setVariants(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load variants');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9ca3af' }}>Loading variants...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: '#e879f9', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Campaign
          </Link>
        </div>

        <h1 style={{ margin: '0 0 16px 0', fontSize: '28px', fontWeight: 600, color: '#fff' }}>
          🎨 Personalization Variants
        </h1>

        <div style={{
          padding: '16px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          marginBottom: '32px',
          border: '1px solid #333',
        }}>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
            Variants are read-only. Email templates and weights are configured during campaign setup.
          </p>
        </div>

        {error && (
          <div style={{ padding: '16px', backgroundColor: '#7f1d1d', borderRadius: '8px', marginBottom: '24px', color: '#fecaca' }}>
            {error}
          </div>
        )}

        {variants.length === 0 ? (
          <div style={{
            padding: '48px',
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            textAlign: 'center',
            border: '1px solid #333',
          }}>
            <p style={{ color: '#6b7280' }}>No variants configured for this campaign.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {variants.map((variant, index) => (
              <div
                key={variant.id}
                style={{
                  padding: '24px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '12px',
                  border: '1px solid #333',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#e879f9',
                      color: '#0f0f0f',
                      borderRadius: '50%',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{variant.name}</h3>
                  </div>
                  <span style={{
                    padding: '6px 14px',
                    backgroundColor: '#3730a3',
                    color: '#c7d2fe',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}>
                    Weight: {variant.weight}%
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>Subject Line</p>
                  <p style={{ margin: 0, padding: '12px', backgroundColor: '#0f0f0f', borderRadius: '6px', color: '#e879f9', fontSize: '15px' }}>
                    {variant.subject_line}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>Body Preview</p>
                  <p style={{ margin: 0, padding: '12px', backgroundColor: '#0f0f0f', borderRadius: '6px', color: '#d1d5db', fontSize: '14px', fontStyle: 'italic' }}>
                    {variant.body_preview}
                  </p>
                </div>

                {variant.performance && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', paddingTop: '16px', borderTop: '1px solid #333' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Sent</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 600, color: '#3b82f6' }}>
                        {variant.performance.sent}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Opened</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 600, color: '#22c55e' }}>
                        {variant.performance.opened}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Replied</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 600, color: '#e879f9' }}>
                        {variant.performance.replied}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
