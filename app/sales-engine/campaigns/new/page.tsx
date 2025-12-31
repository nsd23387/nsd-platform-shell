'use client';

/**
 * New Campaign Page - Target-State Architecture
 * 
 * Campaign creation is not supported in the read-only UI.
 * This page displays a message explaining the governance constraint.
 */

import Link from 'next/link';
import { Icon } from '../../../../design/components/Icon';
import { ReadOnlyBanner } from '../../components/governance';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { READ_ONLY_MESSAGE } from '../../lib/read-only-guard';

export default function NewCampaignPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: NSD_COLORS.surface,
        padding: '32px',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Back link */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/sales-engine"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: NSD_COLORS.secondary,
              textDecoration: 'none',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            <Icon name="arrow-left" size={16} color={NSD_COLORS.secondary} />
            Back to Campaigns
          </Link>
        </div>

        {/* Content */}
        <div
          style={{
            backgroundColor: NSD_COLORS.background,
            borderRadius: NSD_RADIUS.lg,
            border: `1px solid ${NSD_COLORS.border.light}`,
            padding: '48px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              backgroundColor: '#EFF6FF',
              borderRadius: '50%',
              margin: '0 auto 24px',
            }}
          >
            <Icon name="shield" size={32} color="#1E40AF" />
          </div>

          <h1
            style={{
              margin: '0 0 16px 0',
              fontSize: '24px',
              fontWeight: 600,
              color: NSD_COLORS.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}
          >
            Campaign Creation Not Available
          </h1>

          <p
            style={{
              margin: '0 0 24px 0',
              fontSize: '15px',
              color: NSD_COLORS.text.secondary,
              lineHeight: 1.6,
              maxWidth: '500px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {READ_ONLY_MESSAGE}
          </p>

          <ReadOnlyBanner
            variant="warning"
            message="Campaign creation, editing, and mutation operations are managed by backend governance systems. This UI is a read-only observability façade."
          />

          <div
            style={{
              marginTop: '32px',
              padding: '20px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
            }}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: NSD_COLORS.text.primary,
              }}
            >
              What you can do in this UI:
            </h3>
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 20px',
                fontSize: '14px',
                color: NSD_COLORS.text.secondary,
                lineHeight: 1.8,
                textAlign: 'left',
              }}
            >
              <li>View existing campaigns and their governance states</li>
              <li>Monitor campaign execution outcomes</li>
              <li>Review readiness status and blocking reasons</li>
              <li>Observe metrics with confidence and provenance indicators</li>
              <li>View learning signals and autonomy levels</li>
            </ul>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link
              href="/sales-engine"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: NSD_COLORS.primary,
                color: NSD_COLORS.text.inverse,
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: NSD_RADIUS.md,
                textDecoration: 'none',
                fontFamily: NSD_TYPOGRAPHY.fontBody,
              }}
            >
              <Icon name="campaigns" size={16} color={NSD_COLORS.text.inverse} />
              View Campaigns
            </Link>
            <Link
              href="/sales-engine/home"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: NSD_COLORS.background,
                color: NSD_COLORS.text.primary,
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: NSD_RADIUS.md,
                border: `1px solid ${NSD_COLORS.border.default}`,
                textDecoration: 'none',
                fontFamily: NSD_TYPOGRAPHY.fontBody,
              }}
            >
              <Icon name="chart" size={16} color={NSD_COLORS.text.primary} />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
