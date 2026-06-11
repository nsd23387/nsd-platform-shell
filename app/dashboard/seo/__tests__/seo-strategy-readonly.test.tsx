// @vitest-environment happy-dom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { SeoStrategyRecommendation } from '../../../../lib/seoApi';

vi.mock('../../../../hooks/useRBAC', () => ({
  DashboardGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../../components/dashboard', () => ({
  AccessDenied: () => null,
}));

vi.mock('../../../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: { page: '#fff', surface: '#fafafa', muted: '#f1f1f1', active: '#eee' },
    text: { primary: '#111', secondary: '#444', muted: '#888', placeholder: '#aaa' },
    border: { default: '#ddd', strong: '#bbb', subtle: '#eee' },
  }),
}));

vi.mock('../../../../lib/seoApi', () => ({
  getSeoStrategyRecommendations: vi.fn(),
}));

import StrategyPage from '../strategy/page';
import * as seoApi from '../../../../lib/seoApi';

const STRATEGY_ROWS: SeoStrategyRecommendation[] = [
  {
    recommendation_id: 'strategy-create',
    portfolio_rank: 1,
    rec_type: 'CREATE',
    target_url: null,
    proposed_slug: '/commercial-neon-signs/',
    intent: 'commercial investigation',
    entity: 'commercial neon signs',
    rationale: 'No distinct commercial neon signs page exists for the demand cluster.',
    coverage_page: null,
    coverage_score: null,
    coverage_method: null,
    why: 'No existing NSD page covers this cluster cleanly.',
    confidence: 0.84,
    conversion_priority: 78,
    evidence: {
      observation: 'Commercial demand has no dedicated page.',
      leading_indicator: 'Qualified impressions should accrue to the new page.',
      failure_check: 'The slug fails to earn impressions after launch.',
    },
    source_signals: { signal_type: 'competitor_gap', normalized_keyword: 'commercial neon signs' },
    status: 'open',
    depends_on_rework: true,
    created_at: '2026-06-11T00:00:00Z',
    updated_at: '2026-06-11T00:00:00Z',
  },
  {
    recommendation_id: 'strategy-consolidate',
    portfolio_rank: 2,
    rec_type: 'CONSOLIDATE',
    target_url: 'https://www.neonsignsdepot.com/collections/animals/',
    proposed_slug: null,
    intent: 'thin child collection cleanup',
    entity: 'animal neon signs',
    rationale: 'Thin child collections overlap the parent and dilute demand.',
    coverage_page: 'https://www.neonsignsdepot.com/collections/animals/',
    coverage_score: 0.91,
    coverage_method: 'query_page_routing_intended',
    why: 'The parent page already captures the strongest route.',
    confidence: 0.72,
    conversion_priority: 62,
    evidence: { observation: 'Several child collections are thin.' },
    source_signals: { signal_type: 'cannibalization' },
    status: 'open',
    depends_on_rework: false,
    created_at: '2026-06-11T00:00:00Z',
    updated_at: '2026-06-11T00:00:00Z',
  },
  {
    recommendation_id: 'strategy-retire',
    portfolio_rank: 3,
    rec_type: 'RETIRE',
    target_url: 'https://www.neonsignsdepot.com/collections/obsolete/',
    proposed_slug: null,
    intent: 'orphan cleanup',
    entity: 'obsolete collection',
    rationale: 'The page is orphaned and does not map to a current NSD offering.',
    coverage_page: 'https://www.neonsignsdepot.com/collections/obsolete/',
    coverage_score: 0.41,
    coverage_method: 'inventory_text_match',
    why: 'Coverage is weak and demand no longer maps to a current offer.',
    confidence: 0.66,
    conversion_priority: 18,
    evidence: { failure_check: 'Retired URL still receives qualified demand.' },
    source_signals: { signal_type: 'portfolio_quality' },
    status: 'deferred',
    depends_on_rework: false,
    created_at: '2026-06-11T00:00:00Z',
    updated_at: '2026-06-11T00:00:00Z',
  },
  {
    recommendation_id: 'strategy-consolidate-missing-coverage',
    portfolio_rank: 4,
    rec_type: 'CONSOLIDATE',
    target_url: 'https://www.neonsignsdepot.com/collections/custom/',
    proposed_slug: null,
    intent: 'canonical consolidation',
    entity: 'custom neon signs',
    rationale: 'Multiple overlapping collections should consolidate to the canonical custom page.',
    coverage_page: null,
    coverage_score: null,
    coverage_method: null,
    why: null,
    confidence: 0.7,
    conversion_priority: 58,
    evidence: {
      competing_pages: [
        'https://www.neonsignsdepot.com/collections/custom/',
        'https://www.neonsignsdepot.com/collections/custom-signs/',
      ],
    },
    source_signals: { signal_type: 'cannibalization' },
    status: 'open',
    depends_on_rework: false,
    created_at: '2026-06-11T00:00:00Z',
    updated_at: '2026-06-11T00:00:00Z',
  },
  {
    recommendation_id: 'strategy-pivot-missing-coverage',
    portfolio_rank: 5,
    rec_type: 'PIVOT',
    target_url: 'https://www.neonsignsdepot.com/pages/business-neon-signs/',
    proposed_slug: null,
    intent: 'route demand to stronger page',
    entity: 'business neon signs',
    rationale: 'The intended business page should own this query family.',
    coverage_page: null,
    coverage_score: null,
    coverage_method: null,
    why: null,
    confidence: 0.77,
    conversion_priority: 69,
    evidence: { actual_page_url: 'https://www.neonsignsdepot.com/collections/open-signs/' },
    source_signals: { signal_type: 'query_routing' },
    status: 'open',
    depends_on_rework: false,
    created_at: '2026-06-11T00:00:00Z',
    updated_at: '2026-06-11T00:00:00Z',
  },
  {
    recommendation_id: 'strategy-prioritize-missing-coverage',
    portfolio_rank: 6,
    rec_type: 'PRIORITIZE',
    target_url: 'https://www.neonsignsdepot.com/pages/for-businesses/',
    proposed_slug: null,
    intent: 'portfolio prioritization',
    entity: 'SEO page universe',
    rationale: 'This is the highest-priority portfolio page for the current demand mix.',
    coverage_page: null,
    coverage_score: null,
    coverage_method: null,
    why: null,
    confidence: 0.82,
    conversion_priority: 82,
    evidence: {},
    source_signals: { top_target_url: 'https://www.neonsignsdepot.com/pages/for-businesses/' },
    status: 'open',
    depends_on_rework: false,
    created_at: '2026-06-11T00:00:00Z',
    updated_at: '2026-06-11T00:00:00Z',
  },
];

beforeEach(() => {
  vi.mocked(seoApi.getSeoStrategyRecommendations).mockResolvedValue(STRATEGY_ROWS);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SEO Strategy surface', () => {
  it('renders Strategy recommendations as a read-only surface with no mutation controls', async () => {
    render(<StrategyPage />);

    await waitFor(() => {
      expect(screen.getByTestId('strategy-card-strategy-create')).toBeInTheDocument();
    });

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByRole('link', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reject/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /publish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /queue/i })).not.toBeInTheDocument();
    expect(screen.getByText('Read-only portfolio recommendations from the Strategist layer. These are planning moves, not execution candidates.')).toBeInTheDocument();
  });

  it('marks CONSOLIDATE and synthetic RETIRE rows as planning-only and non-approvable', async () => {
    render(<StrategyPage />);

    const consolidate = await screen.findByTestId('strategy-card-strategy-consolidate');
    const retire = await screen.findByTestId('strategy-card-strategy-retire');

    expect(within(consolidate).getByText('CONSOLIDATE')).toBeInTheDocument();
    expect(within(consolidate).getByText('planning only')).toBeInTheDocument();
    expect(within(consolidate).getByText('Strategic planning recommendation, not an approvable mutation')).toBeInTheDocument();

    expect(within(retire).getByText('RETIRE')).toBeInTheDocument();
    expect(within(retire).getByText('planning only')).toBeInTheDocument();
    expect(within(retire).getByText('Strategic planning recommendation, not an approvable mutation')).toBeInTheDocument();
  });

  it('uses proposed_slug as the destination for CREATE rows without a target_url', async () => {
    render(<StrategyPage />);

    const create = await screen.findByTestId('strategy-card-strategy-create');

    expect(within(create).getByText('/commercial-neon-signs/')).toBeInTheDocument();
    expect(within(create).getByText('New page - no existing coverage')).toBeInTheDocument();
    expect(within(create).queryByText('New page / no current target')).not.toBeInTheDocument();
  });

  it('renders coverage evidence and why for existing-page recommendations', async () => {
    render(<StrategyPage />);

    const consolidate = await screen.findByTestId('strategy-card-strategy-consolidate');
    const coverageLinks = within(consolidate).getAllByRole('link', { name: '/collections/animals/' });

    expect(within(consolidate).getByText('Coverage')).toBeInTheDocument();
    expect(coverageLinks).toHaveLength(2);
    expect(coverageLinks[1]).toHaveAttribute('href', '/dashboard/seo/performance?url=https%3A%2F%2Fwww.neonsignsdepot.com%2Fcollections%2Fanimals%2F');
    expect(within(consolidate).getByText('91%')).toBeInTheDocument();
    expect(within(consolidate).getByText('query page routing intended')).toBeInTheDocument();
    expect(within(consolidate).getByText(/The parent page already captures the strongest route/)).toBeInTheDocument();
  });

  it('renders type-specific context and rationale-backed why when coverage evidence is absent', async () => {
    render(<StrategyPage />);

    const consolidate = await screen.findByTestId('strategy-card-strategy-consolidate-missing-coverage');
    const pivot = await screen.findByTestId('strategy-card-strategy-pivot-missing-coverage');
    const prioritize = await screen.findByTestId('strategy-card-strategy-prioritize-missing-coverage');

    expect(within(consolidate).getByText('Competing pages')).toBeInTheDocument();
    expect(within(consolidate).getAllByText(/custom-signs/).length).toBeGreaterThanOrEqual(1);
    expect(within(consolidate).getAllByText(/Multiple overlapping collections should consolidate/).length).toBeGreaterThanOrEqual(1);

    expect(within(pivot).getByText('Routing context')).toBeInTheDocument();
    expect(within(pivot).getByText(/intended: \/pages\/business-neon-signs\//)).toBeInTheDocument();
    expect(within(pivot).getByText(/actual: \/collections\/open-signs\//)).toBeInTheDocument();
    expect(within(pivot).getAllByText(/The intended business page should own this query family/).length).toBeGreaterThanOrEqual(1);

    expect(within(prioritize).getByText('Priority page')).toBeInTheDocument();
    expect(within(prioritize).getAllByText('/pages/for-businesses/').length).toBeGreaterThanOrEqual(1);
    expect(within(prioritize).getAllByText(/highest-priority portfolio page/).length).toBeGreaterThanOrEqual(1);
  });
});
