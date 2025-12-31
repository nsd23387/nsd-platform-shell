'use client';

import { useWizard } from '../WizardContext';
import { PersonalizationEditor } from '../../PersonalizationEditor';

export function StepPersonalization() {
  const { data, updatePersonalization } = useWizard();

  return (
    <div>
      <h2
        style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: 600,
          color: '#1e1e4a',
          fontFamily: 'var(--font-display, Poppins, sans-serif)',
        }}
      >
        Personalization
      </h2>
      <p
        style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: '#6b7280',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
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
