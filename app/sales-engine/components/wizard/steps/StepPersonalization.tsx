'use client';

import { useWizard } from '../WizardContext';
import { PersonalizationEditor } from '../../PersonalizationEditor';
import { text } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

export function StepPersonalization() {
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
          Personalization Strategy
        </h2>
        <p style={{
          margin: '12px 0 0 0',
          fontSize: fontSize.base,
          color: text.secondary,
          fontFamily: fontFamily.body,
          lineHeight: 1.6,
        }}>
          Customize how your outreach communicates with prospects. Set the tone of voice, 
          primary call-to-action, and highlight your unique selling points.
        </p>
      </div>

      <PersonalizationEditor
        personalization={state.personalization}
        onChange={(personalization) => dispatch({ type: 'SET_PERSONALIZATION', personalization })}
      />
    </div>
  );
}
