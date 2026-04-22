/**
 * Proxy: GET /api/proxy/social-metrics?window=7d|30d
 *
 * Returns social media automation pipeline metrics.
 *
 * TODO: Forward to ODS social metrics endpoint once available:
 *   GET ${ODS_API_URL}/api/v1/activity-spine/metrics/social?window=${window}
 * For now, returns realistic mock data so the dashboard can be built and tested.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

interface PillarScore {
  pillar: string;
  avgScore: number;
  postCount: number;
}

interface PlatformMetric {
  platform: string;
  published: number;
  scheduled: number;
  failed: number;
}

interface ApprovalTrend {
  date: string;
  created: number;
  approved: number;
  rejected: number;
}

interface RecentPost {
  id: string;
  platform: string;
  pillar: string;
  qspScore: number;
  status: 'published' | 'approved' | 'pending' | 'rejected';
  createdAt: string;
  hook: string;
}

interface SocialMetricsResponse {
  window: string;
  pipeline: {
    created: number;
    inReview: number;
    approved: number;
    published: number;
    rejected: number;
  };
  avgQspScore: number;
  approvalRate: number;
  pillarScores: PillarScore[];
  platformBreakdown: PlatformMetric[];
  approvalTrend: ApprovalTrend[];
  recentPosts: RecentPost[];
  _source: 'live' | 'mock';
}

function getMockData(window: string): SocialMetricsResponse {
  const is7d = window === '7d';

  return {
    window,
    pipeline: {
      created: is7d ? 18 : 62,
      inReview: is7d ? 3 : 5,
      approved: is7d ? 12 : 45,
      published: is7d ? 10 : 38,
      rejected: is7d ? 3 : 12,
    },
    avgQspScore: 72,
    approvalRate: is7d ? 0.80 : 0.79,
    pillarScores: [
      { pillar: 'Business Neon', avgScore: 78, postCount: is7d ? 7 : 25 },
      { pillar: 'Custom Gifts', avgScore: 71, postCount: is7d ? 5 : 18 },
      { pillar: 'Aesthetic & Lifestyle', avgScore: 68, postCount: is7d ? 4 : 12 },
      { pillar: 'Behind The Scenes', avgScore: 65, postCount: is7d ? 2 : 7 },
    ],
    platformBreakdown: [
      { platform: 'TikTok', published: is7d ? 5 : 18, scheduled: 2, failed: 0 },
      { platform: 'LinkedIn', published: is7d ? 3 : 12, scheduled: 1, failed: 1 },
      { platform: 'Twitter', published: is7d ? 2 : 8, scheduled: 0, failed: 0 },
    ],
    approvalTrend: is7d
      ? [
          { date: '2026-04-16', created: 3, approved: 2, rejected: 0 },
          { date: '2026-04-17', created: 2, approved: 2, rejected: 1 },
          { date: '2026-04-18', created: 3, approved: 1, rejected: 0 },
          { date: '2026-04-19', created: 2, approved: 2, rejected: 0 },
          { date: '2026-04-20', created: 3, approved: 2, rejected: 1 },
          { date: '2026-04-21', created: 3, approved: 2, rejected: 1 },
          { date: '2026-04-22', created: 2, approved: 1, rejected: 0 },
        ]
      : [
          { date: 'W1', created: 14, approved: 10, rejected: 3 },
          { date: 'W2', created: 16, approved: 12, rejected: 2 },
          { date: 'W3', created: 18, approved: 13, rejected: 4 },
          { date: 'W4', created: 14, approved: 10, rejected: 3 },
        ],
    recentPosts: [
      { id: 'sp-001', platform: 'LinkedIn', pillar: 'Business Neon', qspScore: 85, status: 'published', createdAt: '2026-04-22T10:30:00Z', hook: 'Your sign is the first thing customers see.' },
      { id: 'sp-002', platform: 'TikTok', pillar: 'Behind The Scenes', qspScore: 72, status: 'published', createdAt: '2026-04-22T09:15:00Z', hook: 'Watch how we build a 6ft neon sign from scratch.' },
      { id: 'sp-003', platform: 'Twitter', pillar: 'Custom Gifts', qspScore: 68, status: 'approved', createdAt: '2026-04-21T16:00:00Z', hook: 'Your words. Their wall. A gift that lasts.' },
      { id: 'sp-004', platform: 'LinkedIn', pillar: 'Business Neon', qspScore: 81, status: 'published', createdAt: '2026-04-21T11:00:00Z', hook: 'This restaurant saw 40% more walk-ins after installing custom neon.' },
      { id: 'sp-005', platform: 'TikTok', pillar: 'Aesthetic & Lifestyle', qspScore: 58, status: 'rejected', createdAt: '2026-04-21T08:30:00Z', hook: 'Transform your space with custom LED neon.' },
      { id: 'sp-006', platform: 'LinkedIn', pillar: 'Business Neon', qspScore: 76, status: 'pending', createdAt: '2026-04-20T14:00:00Z', hook: 'Stand out on the high street — custom signage built for you.' },
      { id: 'sp-007', platform: 'TikTok', pillar: 'Behind The Scenes', qspScore: 70, status: 'published', createdAt: '2026-04-20T10:00:00Z', hook: 'From design to delivery in 5 days.' },
      { id: 'sp-008', platform: 'Twitter', pillar: 'Business Neon', qspScore: 82, status: 'published', createdAt: '2026-04-19T15:30:00Z', hook: 'Made to order. Built to last.' },
      { id: 'sp-009', platform: 'LinkedIn', pillar: 'Custom Gifts', qspScore: 74, status: 'published', createdAt: '2026-04-19T09:00:00Z', hook: 'Not just a sign — a statement piece.' },
      { id: 'sp-010', platform: 'TikTok', pillar: 'Aesthetic & Lifestyle', qspScore: 66, status: 'published', createdAt: '2026-04-18T12:00:00Z', hook: 'Neon glow, your way.' },
    ],
    _source: 'mock',
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const window = searchParams.get('window') || '7d';

  // TODO: Once ODS social metrics endpoint is available, forward to:
  //   const ODS_API_URL = process.env.ODS_API_URL;
  //   const targetUrl = `${ODS_API_URL}/api/v1/activity-spine/metrics/social?window=${window}`;
  // For now, return mock data.

  return NextResponse.json(getMockData(window));
}
