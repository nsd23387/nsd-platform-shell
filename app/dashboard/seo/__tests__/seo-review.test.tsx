// @vitest-environment happy-dom
// =============================================================================
// SEO Review — end-to-end-style integration coverage.
//
// Renders the real Review portfolio + page dossier + Suppressed audit page
// components with the seoApi data layer mocked, so we exercise the actual UI
// flow without touching the live Supabase/engine write paths.
//
// Covers the "Done looks like" acceptance for Task #13:
//   - /dashboard/seo renders buckets with counts
//   - opening a page dossier shows demand + candidates
//   - approving / rejecting a candidate updates its state
//   - the suppressed audit page renders with a reason rollup (and filters)
// =============================================================================

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type {
  PortfolioPage, PageDossier, SuppressedAudit, PageDossierCandidate,
} from '../../../../lib/seoApi';

// -----------------------------------------------------------------------------
// Mocks — isolate the components from contexts, RBAC, theming and the network.
// -----------------------------------------------------------------------------
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
  getSeoPageDossier: vi.fn(),
  getSeoCandidateQueue: vi.fn(),
  approveEngineCandidate: vi.fn(),
  rejectEngineCandidate: vi.fn(),
  getSeoSuppressed: vi.fn(),
}));

// Imported after the mocks above are registered.
import SeoReviewPage from '../page';
import SeoSuppressedPage from '../suppressed/page';
import * as seoApi from '../../../../lib/seoApi';

// -----------------------------------------------------------------------------
// Fixtures.
// -----------------------------------------------------------------------------
function makePage(over: Partial<PortfolioPage> & Pick<PortfolioPage, 'url' | 'bucket'>): PortfolioPage {
  return {
    content_type: 'page',
    status_class: 'canonical_live',
    needs_verify: false,
    gsc_impressions: 100,
    gsc_top_query: 'neon sign',
    gsc_best_position: 12,
    top_query: 'neon sign',
    top_q_impr: 100,
    top_q_pos: 12,
    has_rankmath_redirect: false,
    rankmath_redirect_target: null,
    http_status: 200,
    kw_volume: 500,
    kw_difficulty: 30,
    kw_cpc: 1.2,
    has_dataforseo: true,
    is_competitor_only: false,
    ...over,
  };
}

const PORTFOLIO: PortfolioPage[] = [
  makePage({ url: 'https://www.neonsignsdepot.com/win-a', bucket: 'win', gsc_best_position: 4 }),
  makePage({ url: 'https://www.neonsignsdepot.com/win-b', bucket: 'win', gsc_best_position: 8 }),
  makePage({ url: 'https://www.neonsignsdepot.com/strategic-a', bucket: 'strategic', gsc_best_position: 55 }),
  makePage({ url: 'https://www.neonsignsdepot.com/fix-a', bucket: 'fix', has_rankmath_redirect: true }),
  makePage({
    url: 'https://www.neonsignsdepot.com/lost-a',
    bucket: 'lost',
    status_class: 'lost',
    http_status: 404,
    gsc_impressions: 1234,
  }),
];

const WIN_URL = 'https://www.neonsignsdepot.com/win-a';

function makeDossier(approvalStatus: string): PageDossier {
  return {
    page: {
      url: WIN_URL,
      content_type: 'page',
      status_class: 'canonical_live',
      gsc_impressions: 4200,
      gsc_top_query: 'custom neon sign',
      gsc_best_position: 6,
      has_rankmath_redirect: false,
      rankmath_redirect_target: null,
      http_status: 200,
      canonical_url: WIN_URL,
      indexable: true,
      noindex: false,
      in_404_monitor: false,
      needs_verify: false,
    },
    demand: [
      {
        query: 'custom neon sign',
        impressions: 3200,
        clicks: 120,
        avg_position: 6.1,
        kw_volume: 900,
        kw_difficulty: 28,
        kw_cpc: 1.5,
        is_discard: false,
        discard_reason: null,
      },
      {
        query: 'neon sign repair',
        impressions: 80,
        clicks: 1,
        avg_position: 40,
        kw_volume: 50,
        kw_difficulty: 10,
        kw_cpc: 0.5,
        is_discard: true,
        discard_reason: 'repair / off-intent query',
      },
    ],
    candidates: [
      {
        candidate_id: 'cand-1',
        opportunity_id: 'opp-1',
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
        approval_status: approvalStatus,
        execution_status: null,
        target_page_url: WIN_URL,
      },
    ],
  };
}

const SUPPRESSED: SuppressedAudit = {
  total: 3,
  returned: 3,
  reasons: [
    { reason: 'low_relevance', count: 2 },
    { reason: 'duplicate', count: 1 },
  ],
  rows: [
    {
      id: 'sup-1',
      generator: 'cluster_engine',
      mutation_type: 'seo_title',
      target_url: 'https://www.neonsignsdepot.com/a',
      gate_reasons: ['low_relevance'],
      relevance_score: 0.12,
      created_at: '2026-05-01T00:00:00Z',
    },
    {
      id: 'sup-2',
      generator: 'cluster_engine',
      mutation_type: 'meta_description',
      target_url: 'https://www.neonsignsdepot.com/b',
      gate_reasons: ['low_relevance'],
      relevance_score: 0.2,
      created_at: '2026-05-02T00:00:00Z',
    },
    {
      id: 'sup-3',
      generator: 'cluster_engine',
      mutation_type: 'canonical',
      target_url: 'https://www.neonsignsdepot.com/c',
      gate_reasons: ['duplicate'],
      relevance_score: 0.05,
      created_at: '2026-05-03T00:00:00Z',
    },
  ],
};

// -----------------------------------------------------------------------------
// Setup.
// -----------------------------------------------------------------------------
function makeQueueCandidate(id: string, url: string): PageDossierCandidate {
  return {
    candidate_id: id,
    opportunity_id: `opp-${id}`,
    mutation_type: 'seo_title',
    primary_remedy: 'improve_ctr',
    proposed_value: `Proposed title for ${id}`,
    current_value_snapshot: 'Old title',
    evidence_summary: 'Low CTR vs SERP average.',
    gate_reasons: [],
    opportunity_score: 80,
    opportunity_urgency: 'high',
    confidence_tier: 'high',
    source_confidence: 'high',
    approval_status: 'pending',
    execution_status: null,
    target_page_url: url,
  };
}

const QUEUE: PageDossierCandidate[] = [
  makeQueueCandidate('q-1', 'https://www.neonsignsdepot.com/win-a'),
  makeQueueCandidate('q-2', 'https://www.neonsignsdepot.com/win-b'),
  makeQueueCandidate('q-3', 'https://www.neonsignsdepot.com/strategic-a'),
];

beforeEach(() => {
  vi.mocked(seoApi.getSeoPortfolio).mockResolvedValue(PORTFOLIO);
  vi.mocked(seoApi.getSeoSuppressed).mockResolvedValue(SUPPRESSED);
  vi.mocked(seoApi.getSeoPageDossier).mockResolvedValue(makeDossier('pending'));
  vi.mocked(seoApi.getSeoCandidateQueue).mockResolvedValue({ candidates: QUEUE, returned: QUEUE.length });
  vi.mocked(seoApi.approveEngineCandidate).mockResolvedValue(undefined);
  vi.mocked(seoApi.rejectEngineCandidate).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------------
// Tests.
// -----------------------------------------------------------------------------
describe('SEO Review — portfolio', () => {
  it('renders buckets with the correct counts', async () => {
    render(<SeoReviewPage />);

    // Wait for the portfolio fetch to resolve and the KPI strip to render.
    const winKpi = await screen.findByTestId('kpi-win');

    expect(within(winKpi).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-strategic')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-fix')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-lost')).getByText('1')).toBeInTheDocument();

    // Lost impressions roll up the single lost page's GSC impressions.
    expect(within(screen.getByTestId('kpi-lost-impressions')).getByText('1,234')).toBeInTheDocument();

    // Page cards render per bucket.
    expect(screen.getByTestId(`card-page-${WIN_URL}`)).toBeInTheDocument();
  });
});

describe('SEO Review — page dossier', () => {
  it('opens a dossier showing demand and engine candidates', async () => {
    render(<SeoReviewPage />);

    const card = await screen.findByTestId(`card-page-${WIN_URL}`);
    fireEvent.click(card);

    // Drawer opens and the dossier fetch resolves.
    await screen.findByTestId('drawer-page-dossier');
    expect(seoApi.getSeoPageDossier).toHaveBeenCalledWith(WIN_URL);

    // Demand rows (real + discard) render. The top query also appears in the
    // primary-target panel, so scope these assertions to the demand rows.
    expect(within(screen.getByTestId('row-demand-0')).getByText('custom neon sign')).toBeInTheDocument();
    expect(within(screen.getByTestId('row-demand-1')).getByText('neon sign repair')).toBeInTheDocument();

    // Lane-1 engine candidate renders with its action buttons.
    expect(screen.getByTestId('card-candidate-cand-1')).toBeInTheDocument();
    expect(screen.getByTestId('button-approve-cand-1')).toBeInTheDocument();
    expect(screen.getByTestId('button-reject-cand-1')).toBeInTheDocument();
  });
});

describe('SEO Review — Lane-1 approve / reject', () => {
  it('approving a candidate calls the engine and reflects the approved state', async () => {
    // The dossier refetch (triggered by onDone) returns the candidate as approved.
    vi.mocked(seoApi.getSeoPageDossier)
      .mockResolvedValueOnce(makeDossier('pending'))
      .mockResolvedValue(makeDossier('approved'));

    render(<SeoReviewPage />);
    fireEvent.click(await screen.findByTestId(`card-page-${WIN_URL}`));

    const approveBtn = await screen.findByTestId('button-approve-cand-1');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(seoApi.approveEngineCandidate).toHaveBeenCalledWith(
        expect.objectContaining({ candidate_id: 'cand-1', opportunity_id: 'opp-1' }),
      );
    });

    // After the action + dossier refetch, the candidate reflects "approved".
    // (The candidate card remounts on reload, so query fresh from the screen.)
    expect(await screen.findByText('approved')).toBeInTheDocument();
    // The approve/reject buttons disappear once the candidate is no longer pending.
    await waitFor(() => {
      expect(screen.queryByTestId('button-approve-cand-1')).not.toBeInTheDocument();
    });
  });

  it('rejecting a candidate calls the engine and reflects the rejected state', async () => {
    vi.mocked(seoApi.getSeoPageDossier)
      .mockResolvedValueOnce(makeDossier('pending'))
      .mockResolvedValue(makeDossier('rejected'));

    render(<SeoReviewPage />);
    fireEvent.click(await screen.findByTestId(`card-page-${WIN_URL}`));

    const rejectBtn = await screen.findByTestId('button-reject-cand-1');
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(seoApi.rejectEngineCandidate).toHaveBeenCalledWith(
        expect.objectContaining({ candidate_id: 'cand-1', opportunity_id: 'opp-1' }),
      );
    });

    expect(await screen.findByText('rejected')).toBeInTheDocument();
  });
});

describe('SEO Suppressed audit', () => {
  it('renders the reason rollup and filters rows by reason', async () => {
    render(<SeoSuppressedPage />);

    // Reason rollup chips render with counts.
    const lowChip = await screen.findByTestId('chip-reason-low_relevance');
    expect(within(lowChip).getByText('· 2')).toBeInTheDocument();
    expect(within(screen.getByTestId('chip-reason-duplicate')).getByText('· 1')).toBeInTheDocument();

    // All three suppressed rows render initially.
    expect(screen.getByTestId('row-suppressed-sup-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-suppressed-sup-2')).toBeInTheDocument();
    expect(screen.getByTestId('row-suppressed-sup-3')).toBeInTheDocument();

    // Filtering by "low_relevance" hides the duplicate-only row.
    fireEvent.click(lowChip);

    await waitFor(() => {
      expect(screen.queryByTestId('row-suppressed-sup-3')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('row-suppressed-sup-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-suppressed-sup-2')).toBeInTheDocument();
    expect(screen.getByText(/Filtered by/)).toBeInTheDocument();
  });
});

describe('SEO Review — portfolio-wide action queue (bulk)', () => {
  it('switching to the queue view lists all pending engine candidates', async () => {
    render(<SeoReviewPage />);

    fireEvent.click(await screen.findByTestId('button-view-queue'));

    // Queue fetch resolves and all three candidates render.
    await screen.findByTestId('view-queue');
    expect(seoApi.getSeoCandidateQueue).toHaveBeenCalled();
    expect(screen.getByTestId('row-queue-q-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-queue-q-2')).toBeInTheDocument();
    expect(screen.getByTestId('row-queue-q-3')).toBeInTheDocument();
  });

  it('select-all + bulk approve calls approve for every candidate and refetches', async () => {
    render(<SeoReviewPage />);
    fireEvent.click(await screen.findByTestId('button-view-queue'));
    await screen.findByTestId('row-queue-q-1');

    // Select all, then bulk approve.
    fireEvent.click(screen.getByTestId('checkbox-queue-all'));
    expect(screen.getByTestId('text-queue-selected')).toHaveTextContent('3 selected');

    fireEvent.click(screen.getByTestId('button-bulk-approve'));

    await waitFor(() => {
      expect(seoApi.approveEngineCandidate).toHaveBeenCalledTimes(3);
    });
    expect(seoApi.approveEngineCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ candidate_id: 'q-1', opportunity_id: 'opp-q-1' }),
    );
    // Cache refresh: the queue is refetched after the bulk action (initial + reload).
    await waitFor(() => {
      expect(seoApi.getSeoCandidateQueue).toHaveBeenCalledTimes(2);
    });
  });

  it('multi-select bulk reject only acts on the chosen candidates', async () => {
    render(<SeoReviewPage />);
    fireEvent.click(await screen.findByTestId('button-view-queue'));
    await screen.findByTestId('row-queue-q-1');

    // Pick two of the three candidates.
    fireEvent.click(screen.getByTestId('checkbox-queue-q-1'));
    fireEvent.click(screen.getByTestId('checkbox-queue-q-3'));
    expect(screen.getByTestId('text-queue-selected')).toHaveTextContent('2 selected');

    fireEvent.click(screen.getByTestId('button-bulk-reject'));

    await waitFor(() => {
      expect(seoApi.rejectEngineCandidate).toHaveBeenCalledTimes(2);
    });
    const rejectedIds = vi.mocked(seoApi.rejectEngineCandidate).mock.calls.map((c) => c[0].candidate_id);
    expect(rejectedIds.sort()).toEqual(['q-1', 'q-3']);
    expect(seoApi.approveEngineCandidate).not.toHaveBeenCalled();
  });
});

describe('SEO Review — action queue filter + sort', () => {
  // A diverse queue so the remedy / urgency / confidence filters and the sort
  // control each have something to bite on.
  const DIVERSE: PageDossierCandidate[] = [
    { ...makeQueueCandidate('d-ctr', 'https://www.neonsignsdepot.com/aaa'), primary_remedy: 'improve_ctr', opportunity_urgency: 'low', confidence_tier: 'low', opportunity_score: 10 },
    { ...makeQueueCandidate('d-meta', 'https://www.neonsignsdepot.com/zzz'), primary_remedy: 'strengthen_page', opportunity_urgency: 'high', confidence_tier: 'high', opportunity_score: 90 },
    { ...makeQueueCandidate('d-link', 'https://www.neonsignsdepot.com/mmm'), primary_remedy: 'add_internal_links', opportunity_urgency: 'medium', confidence_tier: 'medium', opportunity_score: 50 },
  ];

  beforeEach(() => {
    vi.mocked(seoApi.getSeoCandidateQueue).mockResolvedValue({ candidates: DIVERSE, returned: DIVERSE.length });
  });

  it('filtering by remedy narrows the queue and updates the count summary', async () => {
    render(<SeoReviewPage />);
    fireEvent.click(await screen.findByTestId('button-view-queue'));
    await screen.findByTestId('row-queue-d-ctr');

    fireEvent.change(screen.getByTestId('select-queue-remedy'), { target: { value: 'strengthen_page' } });

    expect(screen.getByTestId('row-queue-d-meta')).toBeInTheDocument();
    expect(screen.queryByTestId('row-queue-d-ctr')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-queue-d-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('text-queue-selected')).toHaveTextContent('1 of 3 pending');
  });

  it('sorting by target page orders rows alphabetically by path', async () => {
    render(<SeoReviewPage />);
    fireEvent.click(await screen.findByTestId('button-view-queue'));
    await screen.findByTestId('row-queue-d-ctr');

    fireEvent.change(screen.getByTestId('select-queue-sort'), { target: { value: 'page' } });

    const order = screen.getAllByTestId(/^row-queue-/).map((el) => el.getAttribute('data-testid'));
    expect(order).toEqual(['row-queue-d-ctr', 'row-queue-d-link', 'row-queue-d-meta']);
  });

  it('sorting by urgency puts high-urgency candidates first', async () => {
    render(<SeoReviewPage />);
    fireEvent.click(await screen.findByTestId('button-view-queue'));
    await screen.findByTestId('row-queue-d-ctr');

    fireEvent.change(screen.getByTestId('select-queue-sort'), { target: { value: 'urgency' } });

    const order = screen.getAllByTestId(/^row-queue-/).map((el) => el.getAttribute('data-testid'));
    expect(order).toEqual(['row-queue-d-meta', 'row-queue-d-link', 'row-queue-d-ctr']);
  });

  it('clearing filters restores the full queue', async () => {
    render(<SeoReviewPage />);
    fireEvent.click(await screen.findByTestId('button-view-queue'));
    await screen.findByTestId('row-queue-d-ctr');

    fireEvent.change(screen.getByTestId('select-queue-confidence'), { target: { value: 'high' } });
    expect(screen.queryByTestId('row-queue-d-ctr')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('button-queue-clear-filters'));
    expect(screen.getByTestId('row-queue-d-ctr')).toBeInTheDocument();
    expect(screen.getByTestId('row-queue-d-meta')).toBeInTheDocument();
    expect(screen.getByTestId('row-queue-d-link')).toBeInTheDocument();
  });
});
