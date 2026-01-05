'use client';

import { useWizard } from '../WizardContext';
import { PersonalizationEditor } from '../../PersonalizationEditor';
import { NSD_COLORS, NSD_TYPOGRAPHY } from '../../../lib/design-tokens';

export function StepPersonalization() {
  const { data, updatePersonalization } = useWizard();

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
        Personalization
      </h2>
      <p
        style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: NSD_COLORS.text.secondary,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
        }}
      >
        Configure messaging tone and call-to-action for your outreach.
      </p>

      <PersonalizationEditor
        personalization={data.personalization}
        onChange={updatePersonalization}
      />
    </div>
  );
}
