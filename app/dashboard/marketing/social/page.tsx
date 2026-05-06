'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { DashboardCard } from '../../../../components/dashboard';
import { EngineCard } from '../components/adminto/EngineCard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { space, radius } from '../../../../design/tokens/spacing';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';

// ── Types ────────────────────────────────────────────────────────────────────

interface SocialMetrics {
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
  pillarScores: { pillar: string; avgScore: number; postCount: number }[];
  platformBreakdown: { platform: string; published: number; scheduled: number; failed: number }[];
  approvalTrend: { date: string; created: number; approved: number; rejected: number }[];
  recentPosts: {
    id: string;
    platform: string;
    pillar: string;
    qspScore: number;
    status: 'published' | 'approved' | 'pending' | 'rejected';
    createdAt: string;
    hook: string;
  }[];
  _source: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function useSocialMetrics(window: string) {
  const [data, setData] = useState<SocialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/proxy/social-metrics?window=${window}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [window]);

  return { data, loading, error };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  published: '#16a34a',
  approved: '#6b6bd4',
  pending: '#f59e0b',
  rejected: '#dc2626',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SocialDashboardPage() {
  const tc = useThemeColors();
  const [window, setWindow] = useState<'7d' | '30d'>('7d');
  const { data, loading, error } = useSocialMetrics(window);

  const chartColors = tc.chartColors;

  return (
    <div style={{ padding: space['6'], maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: space['6'],
      }}>
        <div>
          <h1 style={{
            fontFamily: fontFamily.display,
            fontSize: fontSize['2xl'],
            fontWeight: fontWeight.semibold,
            color: tc.text.primary,
            lineHeight: lineHeight.tight,
            marginBottom: space['1'],
          }}>
            Social Automation
          </h1>
          <p style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.base,
            color: tc.text.muted,
          }}>
            Content pipeline status, QSP scores, and publishing metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: space['1'] }}>
          {(['7d', '30d'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              style={{
                padding: `${space['1.5']} ${space['3']}`,
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: window === w ? fontWeight.semibold : fontWeight.normal,
                color: window === w ? tc.text.primary : tc.text.muted,
                backgroundColor: window === w ? tc.background.muted : 'transparent',
                border: `1px solid ${window === w ? tc.border.strong : tc.border.default}`,
                borderRadius: radius.md,
                cursor: 'pointer',
              }}
            >
              {w === '7d' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          padding: space['4'],
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: radius.lg,
          color: '#dc2626',
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
          marginBottom: space['4'],
        }}>
          Failed to load social metrics: {error}
        </div>
      )}

      {/* Pipeline KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: space['4'],
        marginBottom: space['6'],
      }}>
        <DashboardCard
          title="Posts Created"
          value={loading ? undefined : String(data?.pipeline.created ?? 0)}
          subtitle={`${data?.pipeline.inReview ?? 0} in review`}
          timeWindow={window}
          loading={loading}
        />
        <DashboardCard
          title="Posts Approved"
          value={loading ? undefined : String(data?.pipeline.approved ?? 0)}
          subtitle={`${Math.round((data?.approvalRate ?? 0) * 100)}% approval rate`}
          timeWindow={window}
          loading={loading}
        />
        <DashboardCard
          title="Posts Published"
          value={loading ? undefined : String(data?.pipeline.published ?? 0)}
          subtitle={`${data?.pipeline.rejected ?? 0} rejected`}
          timeWindow={window}
          loading={loading}
        />
        <DashboardCard
          title="Avg QSP Score"
          value={loading ? undefined : String(data?.avgQspScore ?? 0)}
          subtitle="out of 100"
          timeWindow={window}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: space['4'],
        marginBottom: space['6'],
      }}>
        {/* QSP Score by Pillar */}
        <div style={{
          backgroundColor: tc.background.surface,
          border: `1px solid ${tc.border.default}`,
          borderRadius: radius.xl,
          padding: space['5'],
        }}>
          <h3 style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.base,
            fontWeight: fontWeight.medium,
            color: tc.text.muted,
            marginBottom: space['4'],
          }}>
            QSP Score by Content Pillar
          </h3>
          {!loading && data && (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.pillarScores} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={tc.border.subtle} vertical={false} />
                <XAxis
                  dataKey="pillar"
                  tick={{ fill: tc.text.muted, fontSize: 11 }}
                  tickFormatter={(v: string) => v.split(' ')[0]}
                />
                <YAxis domain={[0, 100]} tick={{ fill: tc.text.muted, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tc.background.surface,
                    border: `1px solid ${tc.border.default}`,
                    borderRadius: radius.lg,
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.sm,
                  }}
                />
                <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
                  {data.pillarScores.map((_entry, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {loading && <div style={{ height: 240 }} />}
        </div>

        {/* Platform Breakdown */}
        <div style={{
          backgroundColor: tc.background.surface,
          border: `1px solid ${tc.border.default}`,
          borderRadius: radius.xl,
          padding: space['5'],
        }}>
          <h3 style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.base,
            fontWeight: fontWeight.medium,
            color: tc.text.muted,
            marginBottom: space['4'],
          }}>
            Posts by Platform
          </h3>
          {!loading && data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: space['6'] }}>
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={data.platformBreakdown}
                    dataKey="published"
                    nameKey="platform"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data.platformBreakdown.map((_entry, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tc.background.surface,
                      border: `1px solid ${tc.border.default}`,
                      borderRadius: radius.lg,
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.sm,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {data.platformBreakdown.map((p, i) => (
                  <div key={p.platform} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: space['2'],
                    marginBottom: space['2'],
                  }}>
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: radius.full,
                      backgroundColor: chartColors[i % chartColors.length],
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.sm,
                      color: tc.text.primary,
                      flex: 1,
                    }}>
                      {p.platform}
                    </span>
                    <span style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.semibold,
                      color: tc.text.primary,
                    }}>
                      {p.published}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loading && <div style={{ height: 200 }} />}
        </div>
      </div>

      {/* Approval Trend */}
      <div style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.xl,
        padding: space['5'],
        marginBottom: space['6'],
      }}>
        <h3 style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize.base,
          fontWeight: fontWeight.medium,
          color: tc.text.muted,
          marginBottom: space['4'],
        }}>
          Pipeline Throughput
        </h3>
        {!loading && data && (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.approvalTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-approved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[1]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColors[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.border.subtle} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: tc.text.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: tc.text.muted, fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tc.background.surface,
                  border: `1px solid ${tc.border.default}`,
                  borderRadius: radius.lg,
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="created" name="Created" stroke={chartColors[0]} fill="url(#grad-created)" strokeWidth={2} />
              <Area type="monotone" dataKey="approved" name="Approved" stroke={chartColors[1]} fill="url(#grad-approved)" strokeWidth={2} />
              <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#dc2626" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {loading && <div style={{ height: 240 }} />}
      </div>

      {/* Recent Activity */}
      <div style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.xl,
        padding: space['5'],
      }}>
        <h3 style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize.base,
          fontWeight: fontWeight.medium,
          color: tc.text.muted,
          marginBottom: space['4'],
        }}>
          Recent Posts
        </h3>
        {!loading && data && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Platform', 'Pillar', 'Hook', 'QSP', 'Status', 'Created'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: `${space['2']} ${space['3']}`,
                      fontWeight: fontWeight.medium,
                      color: tc.text.muted,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.04em',
                      fontSize: fontSize.xs,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentPosts.map((post) => (
                  <tr key={post.id} style={{
                    borderBottom: `1px solid ${tc.border.subtle}`,
                  }}>
                    <td style={{ padding: `${space['2']} ${space['3']}`, color: tc.text.primary, fontWeight: fontWeight.medium }}>
                      {post.platform}
                    </td>
                    <td style={{ padding: `${space['2']} ${space['3']}`, color: tc.text.muted }}>
                      {post.pillar}
                    </td>
                    <td style={{
                      padding: `${space['2']} ${space['3']}`,
                      color: tc.text.primary,
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    }}>
                      {post.hook}
                    </td>
                    <td style={{
                      padding: `${space['2']} ${space['3']}`,
                      fontWeight: fontWeight.semibold,
                      color: post.qspScore >= 75 ? '#16a34a' : post.qspScore >= 60 ? tc.text.primary : '#dc2626',
                    }}>
                      {post.qspScore}
                    </td>
                    <td style={{ padding: `${space['2']} ${space['3']}` }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${space['0.5']} ${space['2']}`,
                        borderRadius: radius.full,
                        fontSize: fontSize.xs,
                        fontWeight: fontWeight.medium,
                        color: '#fff',
                        backgroundColor: STATUS_COLORS[post.status] ?? tc.text.muted,
                        textTransform: 'capitalize' as const,
                      }}>
                        {post.status}
                      </span>
                    </td>
                    <td style={{ padding: `${space['2']} ${space['3']}`, color: tc.text.muted, whiteSpace: 'nowrap' as const }}>
                      {formatDate(post.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {loading && (
          <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted }}>
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
