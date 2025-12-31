'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../../../design/components/Icon';
import { StatusBadge } from '../components/StatusBadge';
import { listCampaigns, getDashboardThroughput } from '../lib/api';
import type { Campaign, DashboardThroughput } from '../types/campaign';

export default function ExecutionPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [throughput, setThroughput] = useState<DashboardThroughput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [campaignsData, throughputData] = await Promise.all([
          listCampaigns('RUNNABLE'),
          getDashboardThroughput(),
        ]);
        setCampaigns(campaignsData);
        setThroughput(throughputData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
              Execution
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              Launch approved campaigns with human-initiated execution
            </p>
          </div>
          <Link
            href="/sales-engine/home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#fff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              textDecoration: 'none',
            }}
          >
            <Icon name="arrow-left" size={16} color="#6b7280" />
            Back to Dashboard
          </Link>
        </div>

        <div style={{ backgroundColor: '#fef2f2', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Icon name="shield" size={24} color="#dc2626" />
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#991b1b' }}>
                Execution Not Available
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#b91c1c' }}>
                Campaign execution is managed externally by the execution engine. This UI provides read-only visibility into campaigns that are approved and ready for execution. Execution triggers are handled by the backend system.
              </p>
            </div>
          </div>
        </div>

        {throughput && (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Icon name="chart" size={20} color="#8b5cf6" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
                Safety Gates
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Daily Limit</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>{throughput.dailyLimit}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Used Today</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{throughput.usedToday}</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Remaining</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: throughput.dailyLimit - throughput.usedToday > 50 ? '#10b981' : '#f59e0b' }}>
                  {throughput.dailyLimit - throughput.usedToday}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Icon name="check" size={20} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
              Approved & Ready Campaigns
            </h3>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <p style={{ color: '#6b7280' }}>Loading campaigns...</p>
            </div>
          )}

          {!loading && campaigns.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                No campaigns are currently approved and ready for execution.
              </p>
            </div>
          )}

          {!loading && campaigns.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '10px',
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                      {campaign.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <StatusBadge status={campaign.status} size="sm" />
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        Last updated {new Date(campaign.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {campaign.isRunnable && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: 500 }}>
                        <Icon name="check" size={14} color="#10b981" />
                        Ready
                      </span>
                    )}
                    <Link
                      href={`/sales-engine/campaigns/${campaign.id}`}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        backgroundColor: '#fff',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        textDecoration: 'none',
                      }}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
