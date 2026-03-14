'use client';

import React, { useState } from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet } from '../../../../design/tokens/colors';

interface RecommendationFeedbackModalProps {
  recommendationId: string;
  onSubmit: (id: string, feedbackText: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export function RecommendationFeedbackModal({ recommendationId, onSubmit, onClose, loading }: RecommendationFeedbackModalProps) {
  const tc = useThemeColors();
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(recommendationId, text.trim());
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={loading ? undefined : onClose}
      data-testid="modal-recommendation-feedback"
    >
      <div
        style={{
          backgroundColor: tc.background.surface,
          borderRadius: radius.xl,
          border: `1px solid ${tc.border.default}`,
          padding: space['6'],
          width: '440px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['4'], lineHeight: lineHeight.snug }}>
          Provide Feedback
        </h3>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['4'] }}>
          Share your feedback on this recommendation. The SEO engine will incorporate this into future analyses.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your feedback..."
          rows={5}
          style={{
            width: '100%',
            padding: space['3'],
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            color: tc.text.primary,
            backgroundColor: tc.background.page,
            border: `1px solid ${tc.border.default}`,
            borderRadius: radius.md,
            resize: 'vertical' as const,
            outline: 'none',
            marginBottom: space['4'],
            boxSizing: 'border-box' as const,
          }}
          data-testid="input-feedback-text"
        />
        <div style={{ display: 'flex', gap: space['3'], justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: `${space['2']} ${space['4']}`,
              backgroundColor: tc.background.surface,
              color: tc.text.secondary,
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.md,
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            data-testid="button-cancel-feedback"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            style={{
              padding: `${space['2']} ${space['4']}`,
              backgroundColor: text.trim() && !loading ? violet[500] : tc.background.muted,
              color: text.trim() && !loading ? '#ffffff' : tc.text.muted,
              border: 'none',
              borderRadius: radius.md,
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              cursor: text.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
            data-testid="button-submit-feedback"
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
