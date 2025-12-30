'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignVariant } from '../../../types/campaign';
import { getCampaignVariants } from '../../../lib/api';
import { background, text, border, violet, semantic } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

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
      <div style={{ minHeight: '100vh', backgroundColor: background.page, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontFamily.body }}>
        <p style={{ color: text.muted }}>Loading variants...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: background.page, fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: violet[500], textDecoration: 'none', fontSize: fontSize.sm }}>
            ← Back to Campaign
          </Link>
        </div>

        <h1 style={{ margin: '0 0 16px 0', fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.heading }}>
          🎨 Personalization Variants
        </h1>

        <div style={{
          padding: '16px',
          backgroundColor: background.muted,
          borderRadius: '8px',
          marginBottom: '32px',
          border: `1px solid ${border.subtle}`,
        }}>
          <p style={{ margin: 0, color: text.muted, fontSize: fontSize.sm }}>
            Variants are read-only. Email templates and weights are configured during campaign setup.
          </p>
        </div>

        {error && (
          <div style={{ padding: '16px', backgroundColor: semantic.danger.light, border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '24px', color: semantic.danger.dark }}>
            {error}
          </div>
        )}

        {variants.length === 0 ? (
          <div style={{
            padding: '48px',
            backgroundColor: background.surface,
            borderRadius: '16px',
            textAlign: 'center',
            border: `1px solid ${border.default}`,
          }}>
            <p style={{ color: text.muted }}>No variants configured for this campaign.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {variants.map((variant, index) => (
              <div
                key={variant.id}
                style={{
                  padding: '24px',
                  backgroundColor: background.surface,
                  borderRadius: '12px',
                  border: `1px solid ${border.default}`,
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
                      backgroundColor: violet[500],
                      color: text.inverse,
                      borderRadius: '50%',
                      fontWeight: fontWeight.bold,
                      fontSize: fontSize.sm,
                    }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <h3 style={{ margin: 0, color: text.primary, fontSize: fontSize.lg }}>{variant.name}</h3>
                  </div>
                  <span style={{
                    padding: '6px 14px',
                    backgroundColor: violet[50],
                    color: violet[700],
                    borderRadius: '16px',
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                    border: `1px solid ${violet[200]}`,
                  }}>
                    Weight: {variant.weight}%
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: fontSize.xs, color: text.muted }}>Subject Line</p>
                  <p style={{ margin: 0, padding: '12px', backgroundColor: background.muted, borderRadius: '6px', color: violet[700], fontSize: fontSize.base }}>
                    {variant.subject_line}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: fontSize.xs, color: text.muted }}>Body Preview</p>
                  <p style={{ margin: 0, padding: '12px', backgroundColor: background.muted, borderRadius: '6px', color: text.secondary, fontSize: fontSize.sm, fontStyle: 'italic' }}>
                    {variant.body_preview}
                  </p>
                </div>

                {variant.performance && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', paddingTop: '16px', borderTop: `1px solid ${border.default}` }}>
                    <div>
                      <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Sent</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: semantic.info.base }}>
                        {variant.performance.sent}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Opened</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: semantic.success.base }}>
                        {variant.performance.opened}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted }}>Replied</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: violet[500] }}>
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
