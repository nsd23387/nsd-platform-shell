'use client';

import { useWizard } from '../WizardContext';
import { Icon } from '../../../../../design/components/Icon';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../../lib/design-tokens';

export function StepReview() {
  const { data } = useWizard();

  const sections = [
    {
      title: 'Campaign Details',
      icon: 'campaign',
      items: [
        { label: 'Name', value: data.name || 'Not set' },
        { label: 'Description', value: data.description || 'No description' },
      ],
    },
    {
      title: 'Target Profile',
      icon: 'target',
      items: [
        { label: 'Keywords', value: data.icp.keywords.join(', ') || 'None' },
        { label: 'Industries', value: data.icp.industries.join(', ') || 'None' },
        { label: 'Roles', value: data.icp.roles.join(', ') || 'None' },
        {
          label: 'Company Size',
          value: `${data.icp.employeeSize.min} - ${data.icp.employeeSize.max} employees`,
        },
      ],
    },
    {
      title: 'Messaging',
      icon: 'message',
      items: [
        { label: 'Tone', value: data.personalization.toneOfVoice || 'Not set' },
        { label: 'CTA', value: data.personalization.cta || 'Not set' },
        { label: 'USP', value: data.personalization.usp || 'Not set' },
      ],
    },
  ];

  return (
    <div>
      <h2
        style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: 600,
          color: NSD_COLORS.primary,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        }}
      >
        Review & Create
      </h2>
      <p
        style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: NSD_COLORS.text.secondary,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
        }}
      >
        Review your campaign settings before creating. You can edit these later.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {sections.map((section) => (
          <div
            key={section.title}
            style={{
              padding: '20px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.lg,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: NSD_COLORS.secondary,
                  borderRadius: NSD_RADIUS.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={section.icon as any} size={16} color={NSD_COLORS.text.inverse} />
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: NSD_COLORS.primary,
                  fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                }}
              >
                {section.title}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {section.items.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      color: NSD_COLORS.text.secondary,
                      fontFamily: NSD_TYPOGRAPHY.fontBody,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      color: NSD_COLORS.primary,
                      fontWeight: 500,
                      textAlign: 'right',
                      maxWidth: '60%',
                      fontFamily: NSD_TYPOGRAPHY.fontBody,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: NSD_COLORS.semantic.info.bg,
          borderRadius: NSD_RADIUS.md,
          border: `1px solid ${NSD_COLORS.semantic.info.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Icon name="info" size={20} color={NSD_COLORS.semantic.info.text} />
        <span
          style={{
            fontSize: '14px',
            color: NSD_COLORS.semantic.info.text,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          Campaign will be created in DRAFT status. You can edit and submit for review later.
        </span>
      </div>
    </div>
  );
}
