'use client';

import { useWizard } from '../WizardContext';
import { Icon } from '../../../../../design/components/Icon';
import { background, text, border, violet, semantic } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

export function StepReview() {
  const { state, goToStep } = useWizard();

  const sections = [
    {
      title: 'Campaign Details',
      step: 'basics' as const,
      items: [
        { label: 'Name', value: state.name || 'Not set' },
        { label: 'Description', value: state.description || 'No description' },
      ],
    },
    {
      title: 'ICP & Targeting',
      step: 'icp' as const,
      items: [
        { label: 'Keywords', value: state.icp.keywords.length > 0 ? state.icp.keywords.slice(0, 3).join(', ') + (state.icp.keywords.length > 3 ? ` +${state.icp.keywords.length - 3} more` : '') : 'Not configured' },
        { label: 'Industries', value: state.icp.industries.length > 0 ? state.icp.industries.slice(0, 3).join(', ') + (state.icp.industries.length > 3 ? ` +${state.icp.industries.length - 3} more` : '') : 'Not configured' },
        { label: 'Target Roles', value: state.icp.roles.length > 0 ? state.icp.roles.slice(0, 2).join(', ') + (state.icp.roles.length > 2 ? ` +${state.icp.roles.length - 2} more` : '') : 'Not configured' },
        { label: 'Employee Size', value: `${state.icp.employeeSize.min} - ${state.icp.employeeSize.max}` },
        { label: 'Locations', value: state.icp.locations.length > 0 ? `${state.icp.locations.length} location(s)` : 'Not configured' },
      ],
    },
    {
      title: 'Personalization',
      step: 'personalization' as const,
      items: [
        { label: 'Tone of Voice', value: state.personalization.toneOfVoice.charAt(0).toUpperCase() + state.personalization.toneOfVoice.slice(1) },
        { label: 'Primary CTA', value: state.personalization.primaryCTA || 'Not set' },
        { label: 'Unique Selling Points', value: state.personalization.uniqueSellingPoints.length > 0 ? `${state.personalization.uniqueSellingPoints.length} configured` : 'Not configured' },
      ],
    },
  ];

  const isComplete = state.name.trim().length > 0;

  return (
    <div>
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{
          margin: 0,
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.semibold,
          color: text.primary,
          fontFamily: fontFamily.display,
        }}>
          Review & Create
        </h2>
        <p style={{
          margin: '12px 0 0 0',
          fontSize: fontSize.base,
          color: text.secondary,
          fontFamily: fontFamily.body,
          lineHeight: 1.6,
        }}>
          Review your campaign configuration before creating. Your campaign will be 
          created in DRAFT status and can be edited before submission.
        </p>
      </div>

      <div style={{ maxWidth: '640px' }}>
        {sections.map((section, index) => (
          <div
            key={section.step}
            style={{
              marginBottom: index < sections.length - 1 ? '24px' : 0,
              padding: '24px',
              backgroundColor: background.surface,
              borderRadius: '12px',
              border: `1px solid ${border.subtle}`,
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.medium,
                color: text.primary,
                fontFamily: fontFamily.display,
              }}>
                {section.title}
              </h3>
              <button
                onClick={() => goToStep(section.step)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.medium,
                  fontFamily: fontFamily.body,
                  backgroundColor: 'transparent',
                  color: violet[600],
                  border: `1px solid ${violet[300]}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Icon name="edit" size={14} color={violet[600]} />
                Edit
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {section.items.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingBottom: '12px',
                    borderBottom: `1px solid ${border.subtle}`,
                  }}
                >
                  <span style={{
                    fontSize: fontSize.sm,
                    color: text.muted,
                    fontFamily: fontFamily.body,
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontSize: fontSize.sm,
                    color: item.value.includes('Not') ? text.muted : text.primary,
                    fontFamily: fontFamily.body,
                    textAlign: 'right',
                    maxWidth: '60%',
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: isComplete ? semantic.success.light : semantic.warning.light,
          borderRadius: '12px',
          border: `1px solid ${isComplete ? semantic.success.base : semantic.warning.base}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icon 
              name={isComplete ? 'check' : 'alert'} 
              size={20} 
              color={isComplete ? semantic.success.base : semantic.warning.base} 
            />
            <span style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: isComplete ? semantic.success.dark : semantic.warning.dark,
              fontFamily: fontFamily.body,
            }}>
              {isComplete 
                ? 'Ready to create campaign' 
                : 'Campaign name is required before creating'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
