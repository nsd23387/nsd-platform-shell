// @vitest-environment happy-dom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

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
  getSeoPageEnhancements: vi.fn(),
  approveSeoCandidate: vi.fn(),
  approveSeoPageEnhancement: vi.fn(),
  bulkApproveSeoPageEnhancements: vi.fn(),
  rejectSeoPageEnhancement: vi.fn(),
  skipSeoCandidate: vi.fn(),
}));

import SeoRecommendationsPage from '../recommendations/page';
import * as seoApi from '../../../../lib/seoApi';

const PACKAGE_RESPONSE = {
  packages: [
    {
      enhancement_id: '101',
      canonical_url: 'https://www.neonsignsdepot.com/custom-neon-cocktails/',
      rep_url: null,
      version: 2,
      fields: ['title', 'schema', 'internal_link'],
      change_count: 3,
      member_candidate_ids: ['cand-title', 'cand-schema', 'cand-link'],
      updated_at: '2026-06-25T12:00:00Z',
      changes: [
        {
          candidate_id: 'cand-title',
          mutation_type: 'title_tag_refinement',
          change_kind: 'copy',
          current_value: 'LA Letters Neon Sign',
          proposed_value: 'LA Letters Neon Sign | Custom LED Signs',
          is_noop: false,
        },
        {
          candidate_id: 'cand-schema',
          mutation_type: 'breadcrumb_schema_addition',
          change_kind: 'schema',
          current_value: 'missing',
          proposed_value: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] }),
          is_noop: false,
        },
        {
          candidate_id: 'cand-link',
          mutation_type: 'internal_link_insertion',
          change_kind: 'internal_link',
          current_value: null,
          proposed_value: 'custom neon cocktails',
          is_noop: false,
        },
      ],
      members: [
        {
          candidate_id: 'cand-title',
          opportunity_id: 'opp-title',
          mutation_type: 'title_tag_refinement',
          target_field: 'title',
          field_label: 'title',
          target_page_url: 'https://www.neonsignsdepot.com/custom-neon-cocktails/',
          proposed_value: 'LA Letters Neon Sign | Custom LED Signs',
          current_value_snapshot: 'LA Letters Neon Sign',
          mutation_label: 'Title tag',
          primary_remedy: null,
          opportunity_score: null,
          gate_status: 'accepted',
          approval_status: 'pending',
          execution_status: 'proposed',
          qa_status: null,
          gate_reasons: [],
          auto_publish: true,
          copy_quality_score: null,
          copy_quality_floor: null,
          copy_quality_passes_floor: true,
          copy_regen_status: null,
          safe_to_approve: true,
        },
      ],
      safe_to_bulk_approve: true,
      auto_publish_count: 1,
      draft_count: 0,
    },
  ],
  lifecycle: [],
  counts: { review: 1, evaluating: 0, resolved: 0 },
  policy: { first_verdict_days: 30, final_days: 60 },
  north_star: null,
  money_pages: [],
};

beforeEach(() => {
  vi.mocked(seoApi.getSeoPageEnhancements).mockResolvedValue(PACKAGE_RESPONSE);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SEO Recommendations — review card changes', () => {
  it('renders concrete copy, schema, and internal-link changes instead of a bare count', async () => {
    render(<SeoRecommendationsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('package-card-101')).toBeInTheDocument();
    });

    expect(screen.queryByText('3 changes')).not.toBeInTheDocument();

    expect(screen.getByText('Title tag')).toBeInTheDocument();
    expect(screen.getByText('LA Letters Neon Sign')).toBeInTheDocument();
    expect(screen.getAllByText('LA Letters Neon Sign | Custom LED Signs').length).toBeGreaterThan(0);
    expect(screen.getByText('Adds structured data: BreadcrumbList')).toBeInTheDocument();
    expect(screen.getByText(/Adds internal link:/)).toBeInTheDocument();
    expect(screen.getByText('“custom neon cocktails”')).toBeInTheDocument();

    expect(screen.queryByText(/"@type": "BreadcrumbList"/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /View structured data/i }));
    expect(screen.getByText(/"@type": "BreadcrumbList"/)).toBeInTheDocument();
  });
});
