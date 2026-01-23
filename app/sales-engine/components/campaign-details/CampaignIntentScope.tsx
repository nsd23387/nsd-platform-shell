/**
 * CampaignIntentScope Component
 * 
 * DECISION-FIRST UX:
 * Static, scannable view of campaign configuration.
 * Answers: "Why does this campaign exist?"
 * 
 * PRINCIPLES:
 * - Static information, not dynamic
 * - Easy to scan at a glance
 * - No backend jargon
 * 
 * CAMPAIGN THESIS (optional):
 * One-line statement of campaign purpose for recall, comparison, and auditability.
 * Example: "Identify and qualify engineering leaders at mid-market technology firms for outbound outreach."
 * 
 * REQUIRED FIELDS:
 * - Target industries
 * - Target roles
 * - Keywords
 * - Campaign objective
 * - Learning mode
 */

'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface CampaignIntentScopeProps {
  /** Target industries */
  industries: string[];
  /** Target roles/titles */
  roles: string[];
  /** Keywords or phrases */
  keywords: string[];
  /** Campaign objective (e.g., sourcing, enrichment, outreach) */
  objective: string;
  /** Learning mode (e.g., L1 insight-only) */
  learningMode?: string;
  /** Company size targets */
  companySizes?: string[];
  /** Geographic targets */
  regions?: string[];
  /** Optional: Total addressable market size */
  marketSize?: number;
  /** Optional: One-line campaign thesis statement */
  thesis?: string;
}

function TagList({ items, maxDisplay = 5 }: { items: string[]; maxDisplay?: number }) {
  const displayItems = items.slice(0, maxDisplay);
  const remaining = items.length - maxDisplay;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {displayItems.map((item, index) => (
        <span
          key={index}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: NSD_COLORS.semantic.muted.bg,
            color: NSD_COLORS.text.secondary,
            borderRadius: NSD_RADIUS.full,
            border: `1px solid ${NSD_COLORS.border.light}`,
          }}
        >
          {item}
        </span>
      ))}
      {remaining > 0 && (
        <span
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: NSD_COLORS.semantic.info.bg,
            color: NSD_COLORS.semantic.info.text,
            borderRadius: NSD_RADIUS.full,
          }}
        >
          +{remaining} more
        </span>
      )}
    </div>
  );
}

function ScopeField({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
      }}>
        <Icon name={icon as any} size={14} color={NSD_COLORS.text.muted} />
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: NSD_COLORS.text.muted,
        }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

export function CampaignIntentScope({
  industries,
  roles,
  keywords,
  objective,
  learningMode,
  companySizes,
  regions,
  marketSize,
  thesis,
}: CampaignIntentScopeProps) {
  // Map objective to friendly display
  const objectiveDisplay: Record<string, string> = {
    'sourcing': 'Organization & Contact Sourcing',
    'enrichment': 'Data Enrichment',
    'outreach': 'Outreach Engagement',
    'research': 'Market Research',
    'lead_generation': 'Lead Generation',
  };

  // Map learning mode to friendly display
  const learningModeDisplay: Record<string, string> = {
    'L1': 'L1: Insight Collection Only',
    'L2': 'L2: Learning & Adjustment',
    'L3': 'L3: Full Optimization',
    'none': 'No Learning',
  };

  const hasIndustries = industries.length > 0;
  const hasRoles = roles.length > 0;
  const hasKeywords = keywords.length > 0;
  const hasCompanySizes = companySizes && companySizes.length > 0;
  const hasRegions = regions && regions.length > 0;

  return (
    <div style={{
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
      padding: '24px',
      marginBottom: '24px',
      boxShadow: NSD_SHADOWS.sm,
    }}>
      {/* Campaign Thesis (if provided) */}
      {thesis && (
        <div style={{
          padding: '16px 20px',
          marginBottom: '20px',
          backgroundColor: NSD_COLORS.semantic.info.bg,
          borderRadius: NSD_RADIUS.md,
          borderLeft: `4px solid ${NSD_COLORS.semantic.info.border}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <div style={{ marginTop: '2px', flexShrink: 0 }}>
              <Icon name="lightbulb" size={18} color={NSD_COLORS.semantic.info.text} />
            </div>
            <div>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: NSD_COLORS.semantic.info.text,
                opacity: 0.8,
              }}>
                Campaign Thesis
              </span>
              <p style={{
                margin: '6px 0 0 0',
                fontSize: '15px',
                fontWeight: 500,
                color: NSD_COLORS.semantic.info.text,
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}>
                &ldquo;{thesis}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: NSD_RADIUS.md,
          backgroundColor: NSD_COLORS.semantic.info.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name="target" size={18} color={NSD_COLORS.semantic.info.text} />
        </div>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: NSD_COLORS.text.primary,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          }}>
            Campaign Intent & Scope
          </h3>
          <p style={{
            margin: '2px 0 0 0',
            fontSize: '13px',
            color: NSD_COLORS.text.secondary,
          }}>
            Why this campaign exists
          </p>
        </div>
        {marketSize !== undefined && marketSize > 0 && (
          <div style={{
            marginLeft: 'auto',
            textAlign: 'right',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: NSD_COLORS.text.muted,
            }}>
              Market Size
            </span>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: NSD_COLORS.primary,
            }}>
              {marketSize.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
      }}>
        {/* Left Column */}
        <div>
          {/* Objective */}
          <ScopeField label="Objective" icon="target">
            <span style={{
              fontSize: '14px',
              fontWeight: 500,
              color: NSD_COLORS.text.primary,
            }}>
              {objectiveDisplay[objective] || objective || 'Lead Generation'}
            </span>
          </ScopeField>

          {/* Learning Mode */}
          {learningMode && (
            <ScopeField label="Learning Mode" icon="chart">
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: NSD_COLORS.semantic.active.bg,
                color: NSD_COLORS.semantic.active.text,
                borderRadius: NSD_RADIUS.full,
              }}>
                {learningModeDisplay[learningMode] || learningMode}
              </span>
            </ScopeField>
          )}

          {/* Industries */}
          {hasIndustries && (
            <ScopeField label="Target Industries" icon="building">
              <TagList items={industries} />
            </ScopeField>
          )}
        </div>

        {/* Right Column */}
        <div>
          {/* Roles */}
          {hasRoles && (
            <ScopeField label="Target Roles" icon="users">
              <TagList items={roles} />
            </ScopeField>
          )}

          {/* Keywords */}
          {hasKeywords && (
            <ScopeField label="Keywords" icon="search">
              <TagList items={keywords} maxDisplay={6} />
            </ScopeField>
          )}

          {/* Company Sizes */}
          {hasCompanySizes && (
            <ScopeField label="Company Size" icon="chart">
              <TagList items={companySizes} />
            </ScopeField>
          )}

          {/* Regions */}
          {hasRegions && (
            <ScopeField label="Regions" icon="globe">
              <TagList items={regions} />
            </ScopeField>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!hasIndustries && !hasRoles && !hasKeywords && !hasCompanySizes && !hasRegions && (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: NSD_COLORS.text.muted,
        }}>
          <Icon name="info" size={24} color={NSD_COLORS.text.muted} />
          <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
            Campaign scope will be defined during configuration.
          </p>
        </div>
      )}
    </div>
  );
}

export default CampaignIntentScope;
