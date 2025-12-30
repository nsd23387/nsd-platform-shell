'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignVariant } from '../../../types/campaign';
import { getCampaignVariants } from '../../../lib/api';
import { Icon } from '../../../../../design/components/Icon';
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
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <Link
            href={`/sales-engine/campaigns/${campaignId}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: text.secondary, textDecoration: 'none', fontSize: fontSize.sm }}
          >
            <Icon name="arrow-left" size={16} color={text.secondary} />
            Back to Campaign
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: violet[50],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="variants" size={24} color={violet[600]} />
          </div>
          <h1 style={{ margin: 0, fontSize: fontSize['4xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.display }}>
            Personalization Variants
          </h1>
        </div>

        <div style={{
          padding: '20px 24px',
          backgroundColor: background.muted,
          borderRadius: '12px',
          marginBottom: '40px',
          border: `1px solid ${border.subtle}`,
        }}>
          <p style={{ margin: 0, color: text.muted, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>
            Variants are read-only. Email templates and weights are configured during campaign setup.
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            backgroundColor: semantic.danger.light,
            border: '1px solid #fecaca',
            borderRadius: '12px',
            marginBottom: '32px',
            color: semantic.danger.dark,
          }}>
            <Icon name="alert" size={20} color={semantic.danger.base} />
            {error}
          </div>
        )}

        {variants.length === 0 ? (
          <div style={{
            padding: '64px',
            backgroundColor: background.surface,
            borderRadius: '20px',
            textAlign: 'center',
            border: `1px solid ${border.subtle}`,
          }}>
            <Icon name="variants" size={48} color={text.muted} />
            <p style={{ color: text.muted, marginTop: '16px', fontFamily: fontFamily.body }}>No variants configured for this campaign.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {variants.map((variant, index) => (
              <div
                key={variant.id}
                style={{
                  padding: '28px',
                  backgroundColor: background.surface,
                  borderRadius: '16px',
                  border: `1px solid ${border.subtle}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      backgroundColor: violet[500],
                      color: text.inverse,
                      borderRadius: '50%',
                      fontWeight: fontWeight.semibold,
                      fontSize: fontSize.base,
                      fontFamily: fontFamily.body,
                    }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <h3 style={{ margin: 0, color: text.primary, fontSize: fontSize.lg, fontFamily: fontFamily.display, fontWeight: fontWeight.medium }}>
                      {variant.name}
                    </h3>
                  </div>
                  <span style={{
                    padding: '8px 16px',
                    backgroundColor: violet[50],
                    color: violet[700],
                    borderRadius: '20px',
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                    fontFamily: fontFamily.body,
                    border: `1px solid ${violet[200]}`,
                  }}>
                    Weight: {variant.weight}%
                  </span>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: fontSize.xs, color: text.muted, fontFamily: fontFamily.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Subject Line
                  </p>
                  <p style={{ margin: 0, padding: '14px 16px', backgroundColor: background.muted, borderRadius: '10px', color: violet[700], fontSize: fontSize.base, fontFamily: fontFamily.body }}>
                    {variant.subject_line}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: fontSize.xs, color: text.muted, fontFamily: fontFamily.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Body Preview
                  </p>
                  <p style={{ margin: 0, padding: '14px 16px', backgroundColor: background.muted, borderRadius: '10px', color: text.secondary, fontSize: fontSize.sm, fontFamily: fontFamily.body, fontStyle: 'italic', lineHeight: 1.6 }}>
                    {variant.body_preview}
                  </p>
                </div>

                {variant.performance && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingTop: '20px', borderTop: `1px solid ${border.subtle}` }}>
                    <div>
                      <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted, fontFamily: fontFamily.body }}>Sent</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: semantic.info.base, fontFamily: fontFamily.body }}>
                        {variant.performance.sent}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted, fontFamily: fontFamily.body }}>Opened</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: semantic.success.base, fontFamily: fontFamily.body }}>
                        {variant.performance.opened}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted, fontFamily: fontFamily.body }}>Replied</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: violet[500], fontFamily: fontFamily.body }}>
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
