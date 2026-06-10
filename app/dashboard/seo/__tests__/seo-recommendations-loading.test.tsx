// @vitest-environment happy-dom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { PageDossierCandidate } from '../../../../lib/seoApi';

vi.mock('../../../../hooks/useRBAC', () => ({
  DashboardGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../../components/dashboard', () => ({
  AccessDenied: () => null,
}));

vi.mock('../../../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: { page: '#fff', surface: '#fafafa', muted: '#f1f1f1', active: '#eee' },
    text: { primary: '#111', secondary: '#444', muted: '#888' },
    border: { default: '#ddd', strong: '#bbb', subtle: '#eee' },
  }),
}));

vi.mock('../../../../lib/seoApi', () => ({
  getSeoPortfolio: vi.fn(),
  getSeoCandidateQueue: vi.fn(),
}));

import SeoRecommendationsPage from '../recommendations/page';
import * as seoApi from '../../../../lib/seoApi';

const QUEUE: PageDossierCandidate[] = [
  {
    candidate_id: 'q-1',
    opportunity_id: 'opp-q-1',
    mutation_type: 'seo_title',
    primary_remedy: 'improve_ctr',
    proposed_value: 'Custom Neon Signs | Neon Signs Depot',
    current_value_snapshot: 'Neon Signs',
    evidence_summary: 'Ranking position 6 with low CTR vs SERP average.',
    gate_reasons: [],
    opportunity_score: 87,
    opportunity_urgency: 'high',
    confidence_tier: 'high',
    source_confidence: 'high',
    approval_status: 'pending',
    execution_status: null,
    target_page_url: 'https://www.neonsignsdepot.com/win-a',
  },
];

beforeEach(() => {
  vi.mocked(seoApi.getSeoCandidateQueue).mockResolvedValue({ candidates: QUEUE, returned: QUEUE.length });
  vi.mocked(seoApi.getSeoPortfolio).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SEO Recommendations — loading lifecycle', () => {
  it('settles to an error/empty state without retrying forever when one sub-request fails', async () => {
    vi.mocked(seoApi.getSeoPortfolio).mockRejectedValue(new Error('portfolio timeout'));

    render(<SeoRecommendationsPage />);

    expect(screen.getByText('Loading recommendations…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading recommendations…')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/portfolio timeout/)).toBeInTheDocument();
    expect(screen.getByTestId('empty-recommendations')).toHaveTextContent('Recommendations could not fully load');
    expect(seoApi.getSeoCandidateQueue).toHaveBeenCalledTimes(1);
    expect(seoApi.getSeoPortfolio).toHaveBeenCalledTimes(1);
  });
});
