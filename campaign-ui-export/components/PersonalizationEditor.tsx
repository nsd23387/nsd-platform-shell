'use client';

interface Personalization {
  toneOfVoice: string;
  cta: string;
  usp: string;
}

interface PersonalizationEditorProps {
  personalization: Personalization;
  onChange: (updates: Partial<Personalization>) => void;
}

const toneOptions = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-focused' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'authoritative', label: 'Authoritative', description: 'Expert and confident' },
  { value: 'empathetic', label: 'Empathetic', description: 'Understanding and supportive' },
];

export function PersonalizationEditor({ personalization, onChange }: PersonalizationEditorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '12px',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
          }}
        >
          Tone of Voice
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {toneOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ toneOfVoice: option.value })}
              style={{
                padding: '12px 16px',
                backgroundColor:
                  personalization.toneOfVoice === option.value ? '#f3f0ff' : '#ffffff',
                border:
                  personalization.toneOfVoice === option.value
                    ? '2px solid #8b5cf6'
                    : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: personalization.toneOfVoice === option.value ? '#8b5cf6' : '#374151',
                  fontFamily: 'var(--font-body, Inter, sans-serif)',
                }}
              >
                {option.label}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '2px',
                }}
              >
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
          }}
        >
          Call to Action (CTA)
        </label>
        <input
          type="text"
          value={personalization.cta}
          onChange={(e) => onChange({ cta: e.target.value })}
          placeholder="e.g., Schedule a demo, Start free trial, Learn more"
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
          }}
        />
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '8px',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
          }}
        >
          Unique Selling Proposition (USP)
        </label>
        <textarea
          value={personalization.usp}
          onChange={(e) => onChange({ usp: e.target.value })}
          placeholder="What makes your offering unique? Why should they choose you?"
          rows={3}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'vertical',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
          }}
        />
      </div>
    </div>
  );
}
