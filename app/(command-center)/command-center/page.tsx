'use client';

import Link from 'next/link';
import { Icon, IconName } from '../../../design/components/Icon';
import { background, text, border, violet, magenta } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { useBootstrap, FeatureGuard } from '../../../contexts/BootstrapContext';

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  href: string;
  status: 'active' | 'coming-soon';
  featureFlag?: string;
}

const moduleCards: ModuleCard[] = [
  {
    id: 'sales-engine',
    title: 'Sales Engine',
    description: 'Campaign lifecycle management. Create, edit, submit, approve, and monitor outreach campaigns.',
    icon: 'campaign',
    href: '/command-center/sales-engine',
    status: 'active',
    featureFlag: 'sales_engine',
  },
  {
    id: 'activity-spine',
    title: 'Activity Spine',
    description: 'Real-time analytics and activity monitoring across all business operations.',
    icon: 'metrics',
    href: '#',
    status: 'coming-soon',
  },
  {
    id: 'data-ops',
    title: 'Data Operations',
    description: 'Data pipeline management, quality monitoring, and integration health.',
    icon: 'settings',
    href: '#',
    status: 'coming-soon',
  },
];

export default function CommandCenterPage() {
  const { data } = useBootstrap();

  return (
    <div style={{ padding: '48px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{
          margin: 0,
          fontSize: fontSize['4xl'],
          fontWeight: fontWeight.semibold,
          color: text.primary,
          fontFamily: fontFamily.display,
        }}>
          Welcome back{data?.user?.name ? `, ${data.user.name.split(' ')[0]}` : ''}
        </h1>
        <p style={{
          margin: '12px 0 0 0',
          fontSize: fontSize.lg,
          color: text.secondary,
          fontFamily: fontFamily.body,
        }}>
          NSD Command Center - Unified platform for business operations
        </p>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: fontSize.xl,
          fontWeight: fontWeight.medium,
          color: text.primary,
          fontFamily: fontFamily.display,
        }}>
          Modules
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {moduleCards.map((module) => {
            const Card = (
              <ModuleCardComponent key={module.id} module={module} />
            );

            if (module.featureFlag) {
              return (
                <FeatureGuard key={module.id} feature={module.featureFlag}>
                  {Card}
                </FeatureGuard>
              );
            }
            return Card;
          })}
        </div>
      </div>

      <div style={{
        marginTop: '48px',
        padding: '20px 24px',
        backgroundColor: background.muted,
        borderRadius: '12px',
        border: `1px solid ${border.subtle}`,
      }}>
        <p style={{
          margin: 0,
          fontSize: fontSize.sm,
          color: text.muted,
          fontFamily: fontFamily.body,
        }}>
          NSD Command Center v1.0 - Modules are loaded on-demand for optimal performance. 
          Additional modules will be enabled based on your organization's configuration.
        </p>
      </div>
    </div>
  );
}

function ModuleCardComponent({ module }: { module: ModuleCard }) {
  const isComingSoon = module.status === 'coming-soon';
  
  const cardContent = (
    <div style={{
      padding: '28px',
      backgroundColor: background.surface,
      borderRadius: '16px',
      border: `1px solid ${border.subtle}`,
      opacity: isComingSoon ? 0.6 : 1,
      cursor: isComingSoon ? 'default' : 'pointer',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: isComingSoon ? background.muted : violet[50],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name={module.icon} size={24} color={isComingSoon ? text.muted : violet[600]} />
        </div>
        {isComingSoon && (
          <span style={{
            padding: '4px 10px',
            backgroundColor: background.muted,
            color: text.muted,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.medium,
            fontFamily: fontFamily.body,
            borderRadius: '12px',
          }}>
            Coming Soon
          </span>
        )}
      </div>
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: isComingSoon ? text.muted : text.primary,
        fontFamily: fontFamily.display,
      }}>
        {module.title}
      </h3>
      <p style={{
        margin: 0,
        fontSize: fontSize.sm,
        color: text.secondary,
        fontFamily: fontFamily.body,
        lineHeight: 1.6,
      }}>
        {module.description}
      </p>
    </div>
  );

  if (isComingSoon) {
    return cardContent;
  }

  return (
    <Link href={module.href} style={{ textDecoration: 'none' }}>
      {cardContent}
    </Link>
  );
}
