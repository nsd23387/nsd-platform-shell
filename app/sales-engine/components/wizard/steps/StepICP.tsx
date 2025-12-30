'use client';

import { useWizard } from '../WizardContext';
import { ICPEditor } from '../../ICPEditor';
import { text } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

export function StepICP() {
  const { state, dispatch } = useWizard();

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
          Ideal Customer Profile
        </h2>
        <p style={{
          margin: '12px 0 0 0',
          fontSize: fontSize.base,
          color: text.secondary,
          fontFamily: fontFamily.body,
          lineHeight: 1.6,
        }}>
          Define who you want to reach. Add keywords, target industries, roles, 
          locations, and identify the pain points your solution addresses.
        </p>
      </div>

      <ICPEditor
        icp={state.icp}
        onChange={(icp) => dispatch({ type: 'SET_ICP', icp })}
      />
    </div>
  );
}
