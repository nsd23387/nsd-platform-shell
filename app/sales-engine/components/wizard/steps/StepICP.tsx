'use client';

import { useWizard } from '../WizardContext';
import { ICPEditor } from '../../ICPEditor';
import { NSD_COLORS, NSD_TYPOGRAPHY } from '../../../lib/design-tokens';

export function StepICP() {
  const { data, updateICP } = useWizard();

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
        Ideal Customer Profile
      </h2>
      <p
        style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: NSD_COLORS.text.secondary,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
        }}
      >
        Define who you want to target with this campaign.
      </p>

      <ICPEditor icp={data.icp} onChange={updateICP} />
    </div>
  );
}
