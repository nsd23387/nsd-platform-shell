'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, IconName } from '../../../design/components/Icon';
import { background, text, border, violet, magenta } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { useBootstrap, FeatureGuard } from '../../../contexts/BootstrapContext';

interface ModuleConfig {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  featureFlag?: string;
}

const modules: ModuleConfig[] = [
  { id: 'sales-engine', label: 'Sales Engine', icon: 'campaign', href: '/command-center/sales-engine', featureFlag: 'sales_engine' },
];

export default function CommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data, loading } = useBootstrap();

  const activeModule = modules.find(m => pathname.startsWith(m.href));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: background.page }}>
      <header style={{
        backgroundColor: background.surface,
        borderBottom: `1px solid ${border.subtle}`,
        padding: '0 32px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link
            href="/command-center"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: violet[500],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="settings" size={18} color="#fff" />
            </div>
            <span style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: text.primary,
              fontFamily: fontFamily.display,
            }}>
              Command Center
            </span>
          </Link>

          <nav style={{ display: 'flex', gap: '4px', marginLeft: '16px' }}>
            {modules.map((module) => {
              const isActive = pathname.startsWith(module.href);
              const ModuleLink = (
                <Link
                  key={module.id}
                  href={module.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? violet[50] : 'transparent',
                    color: isActive ? violet[700] : text.secondary,
                    textDecoration: 'none',
                    fontSize: fontSize.sm,
                    fontWeight: isActive ? fontWeight.medium : fontWeight.normal,
                    fontFamily: fontFamily.body,
                    transition: 'background-color 0.2s, color 0.2s',
                  }}
                >
                  <Icon name={module.icon} size={16} color={isActive ? violet[600] : text.muted} />
                  {module.label}
                </Link>
              );

              if (module.featureFlag) {
                return (
                  <FeatureGuard key={module.id} feature={module.featureFlag}>
                    {ModuleLink}
                  </FeatureGuard>
                );
              }
              return ModuleLink;
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {data?.user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: violet[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: violet[700],
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                fontFamily: fontFamily.body,
              }}>
                {data.user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{
                fontSize: fontSize.sm,
                color: text.secondary,
                fontFamily: fontFamily.body,
              }}>
                {data.user.name}
              </span>
            </div>
          )}
        </div>
      </header>

      <main>
        {children}
      </main>
    </div>
  );
}
