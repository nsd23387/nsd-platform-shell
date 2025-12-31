'use client';

import { useWizard } from '../WizardContext';
import { ICPEditor } from '../../ICPEditor';

export function StepICP() {
  const { data, updateICP } = useWizard();

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
        Ideal Customer Profile
      </h2>
      <p
        style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: '#6b7280',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
        }}
      >
        Define who you want to target with this campaign.
      </p>

      <ICPEditor icp={data.icp} onChange={updateICP} />
    </div>
  );
}
