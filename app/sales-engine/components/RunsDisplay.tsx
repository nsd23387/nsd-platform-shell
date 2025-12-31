'use client';

import type { CampaignRun } from '../types/campaign';
import { ProvenancePill } from './governance';
import { deriveProvenance } from '../lib/campaign-state';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../lib/design-tokens';

interface RunsDisplayProps {
  runs: CampaignRun[];
  latestRun?: CampaignRun | null;
}

const statusColors: Record<CampaignRun['status'], { bg: string; text: string; border: string }> = {
  COMPLETED: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  FAILED: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  PARTIAL: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
};

/**
 * RunsDisplay - Execution run history (Read-Only).
 * 
 * Updated for target-state architecture:
 * - Uses "Qualified Leads Processed" terminology
 * - Includes provenance indicators
 * - Emphasizes read-only observability
 * 
 * LEAD MODEL DISTINCTION:
 * - "Qualified Leads" shown here represent records that passed lead qualification
 *   checks (valid email, qualification state) at execution time
 * - This is distinct from "Contacts Observed" which shows all contacts regardless
 *   of email validity or qualification status
 * - The leads_processed count comes directly from the backend execution record
 *   and is not filtered client-side
 * 
 * See: isQualifiedLead() and isValidLeadEmail() in campaign-state.ts for
 * the qualification logic documentation.
 */
export function RunsDisplay({ runs, latestRun }: RunsDisplayProps) {
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.primary,
          }}
        >
          Execution History (Observed)
        </h4>
        <span
          style={{
            padding: '4px 10px',
            fontSize: '10px',
            fontWeight: 600,
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            borderRadius: NSD_RADIUS.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          Read-Only
        </span>
      </div>

      <div style={{ padding: '20px' }}>
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: NSD_COLORS.surface,
            borderRadius: NSD_RADIUS.md,
            marginBottom: '20px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
              lineHeight: 1.5,
            }}
          >
            Execution entries are immutable observability records. No edit, retry, or delete actions are available from this UI.
            All data shown here was recorded by backend systems.
          </p>
        </div>

        {latestRun && (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#F0F9FF',
              borderRadius: NSD_RADIUS.lg,
              marginBottom: '24px',
              border: '1px solid #BAE6FD',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h5
                style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0369A1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Latest Execution
              </h5>
              <ProvenancePill provenance={deriveProvenance(latestRun)} />
            </div>
            <RunRow run={latestRun} />
          </div>
        )}

        {runs.length === 0 ? (
          <EmptyRunsState />
        ) : (
          <div
            style={{
              overflowX: 'auto',
              borderRadius: NSD_RADIUS.md,
              border: `1px solid ${NSD_COLORS.border.light}`,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: NSD_COLORS.surface }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Execution ID</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Observed At</th>
                  <th style={{ textAlign: 'right', padding: '12px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Qualified Leads</th>
                  <th style={{ textAlign: 'right', padding: '12px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Sent</th>
                  <th style={{ textAlign: 'right', padding: '12px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Errors</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', color: NSD_COLORS.text.muted, fontWeight: 500 }}>Provenance</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} style={{ borderTop: `1px solid ${NSD_COLORS.border.light}` }}>
                    <td style={{ padding: '12px 14px', color: NSD_COLORS.text.primary, fontFamily: 'monospace', fontSize: '12px' }}>
                      {run.id.slice(0, 8)}...
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td style={{ padding: '12px 14px', color: NSD_COLORS.text.primary }}>
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', color: NSD_COLORS.text.primary, textAlign: 'right', fontWeight: 500 }}>
                      {run.leads_processed}
                    </td>
                    <td style={{ padding: '12px 14px', color: NSD_COLORS.success, textAlign: 'right', fontWeight: 500 }}>
                      {run.emails_sent}
                    </td>
                    <td style={{ padding: '12px 14px', color: run.errors > 0 ? NSD_COLORS.error : NSD_COLORS.text.primary, textAlign: 'right', fontWeight: 500 }}>
                      {run.errors}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <ProvenancePill provenance={deriveProvenance(run)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyRunsState() {
  return (
    <div
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.lg,
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 16px',
          backgroundColor: NSD_COLORS.background,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        }}
      >
        📋
      </div>
      <h5
        style={{
          margin: '0 0 8px 0',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          color: NSD_COLORS.primary,
        }}
      >
        No Execution Runs Observed
      </h5>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          color: NSD_COLORS.text.secondary,
          maxWidth: '400px',
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: 1.5,
        }}
      >
        Execution runs will appear here once the backend system processes this campaign.
        This UI observes execution records but does not initiate them.
      </p>
    </div>
  );
}

function RunRow({ run }: { run: CampaignRun }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: 500,
            color: '#0369A1',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          Status
        </p>
        <div style={{ marginTop: '6px' }}>
          <RunStatusBadge status={run.status} />
        </div>
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: 500,
            color: '#0369A1',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          Qualified Leads Processed
        </p>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.primary,
          }}
        >
          {run.leads_processed}
        </p>
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: 500,
            color: '#0369A1',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          Emails Sent
        </p>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.success,
          }}
        >
          {run.emails_sent}
        </p>
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: 500,
            color: '#0369A1',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          Errors
        </p>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: run.errors > 0 ? NSD_COLORS.error : NSD_COLORS.primary,
          }}
        >
          {run.errors}
        </p>
      </div>
    </div>
  );
}

function RunStatusBadge({ status }: { status: CampaignRun['status'] }) {
  const colors = statusColors[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: NSD_RADIUS.sm,
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {status}
    </span>
  );
}
