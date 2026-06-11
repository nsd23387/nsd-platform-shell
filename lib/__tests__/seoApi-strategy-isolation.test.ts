import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getRecommendations,
  getSeoCandidateQueue,
  getSeoStrategyRecommendations,
} from '../seoApi';

const recommendationRows = [
  {
    id: 'legacy-rec-1',
    cluster_id: 'cluster-1',
    cluster_topic: 'title optimization',
    primary_keyword: 'custom neon signs',
    recommended_action: 'update title',
    recommended_url: '/for-businesses/',
    opportunity_type: 'optimize_existing_page',
    status: 'pending_review',
    created_at: '2026-06-11T00:00:00Z',
  },
];

const queuePayload = {
  candidates: [
    {
      candidate_id: 'candidate-1',
      mutation_type: 'title_tag_refinement',
      mutation_label: 'Title tag',
      target_page_url: 'https://www.neonsignsdepot.com/for-businesses/',
      opportunity_score: 5,
    },
    {
      candidate_id: 'candidate-2',
      mutation_type: 'meta_description_update',
      mutation_label: 'Meta description',
      target_page_url: 'https://www.neonsignsdepot.com/',
      opportunity_score: 5,
    },
  ],
  returned: 2,
  summary: {
    decisions: 2,
    total_proposals: 2,
    re_review_flagged: 0,
    needs_review: 0,
    live_page_decisions: 2,
    lost_or_nonlive_decisions: 0,
  },
};

const strategyRows = [
  {
    recommendation_id: 'strategy-1',
    portfolio_rank: 1,
    rec_type: 'CREATE',
    target_url: null,
    proposed_slug: '/commercial-neon-signs/',
    intent: 'commercial',
    entity: 'commercial neon signs',
    rationale: 'Strategic gap.',
    confidence: 0.82,
    conversion_priority: 74,
    evidence: {},
    source_signals: {},
    status: 'open',
    depends_on_rework: false,
    created_at: '2026-06-11T00:00:00Z',
    updated_at: '2026-06-11T00:00:00Z',
  },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/proxy/seo/recommendations') {
      return new Response(JSON.stringify({ data: recommendationRows }), { status: 200 });
    }
    if (url === '/api/proxy/seo/candidate-queue') {
      return new Response(JSON.stringify({ data: queuePayload }), { status: 200 });
    }
    if (url === '/api/proxy/seo/strategy') {
      return new Response(JSON.stringify({ data: strategyRows }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: `unexpected url ${url}` }), { status: 500 });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('seoApi Strategy isolation', () => {
  it('keeps the legacy recommendations and candidate queue contracts unchanged', async () => {
    const recommendations = await getRecommendations();
    const queue = await getSeoCandidateQueue();

    expect(recommendations).toEqual(recommendationRows);
    expect(queue.returned).toBe(2);
    expect(queue.candidates.map((candidate) => candidate.mutation_type)).toEqual([
      'title_tag_refinement',
      'meta_description_update',
    ]);
    expect(queue.summary?.decisions).toBe(2);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      '/api/proxy/seo/recommendations',
      '/api/proxy/seo/candidate-queue',
    ]);
    expect(vi.mocked(fetch).mock.calls.every(([, init]) => init == null || !('method' in init))).toBe(true);
  });

  it('fetches Strategy rows from a separate read-only endpoint', async () => {
    const strategy = await getSeoStrategyRecommendations();

    expect(strategy).toEqual(strategyRows);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(['/api/proxy/seo/strategy']);
    expect(vi.mocked(fetch).mock.calls.every(([, init]) => init == null || !('method' in init))).toBe(true);
  });
});
