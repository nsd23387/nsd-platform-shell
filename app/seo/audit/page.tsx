/**
 * SEO Intelligence - Audit Log
 * 
 * Complete audit trail of all SEO domain actions.
 * Immutable record for accountability and learning.
 * 
 * GOVERNANCE:
 * - Read-only display
 * - Cannot modify or delete entries
 * - Shows all actions including system events
 * 
 * NOT ALLOWED:
 * - Editing audit entries
 * - Deleting audit entries
 * - Filtering out sensitive actions
 */

'use client';

import React from 'react';
import {
  background,
  text,
  border,
  semantic,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';

// ============================================
// Component
// ============================================

/**
 * SEO Audit Log Page
 * 
 * Displays:
 * 1. Chronological list of all actions
 * 2. Filterable by action type, user, entity
 * 3. Full context for each entry
 * 
 * NOTE: All data is placeholder. Will be populated when
 * audit logging is connected.
 */
export default function SeoAuditPage() {
  return (
    <div style={containerStyles}>
      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>Audit Log</h1>
        <p style={descStyles}>
          Complete history of all actions in the SEO Intelligence domain.
        </p>
      </div>

      {/* Filters Placeholder */}
      <div style={filtersStyles}>
        <select style={selectStyles} disabled>
          <option>All Actions</option>
        </select>
        <select style={selectStyles} disabled>
          <option>All Users</option>
        </select>
        <select style={selectStyles} disabled>
          <option>All Entity Types</option>
        </select>
        <input
          type="date"
          style={dateInputStyles}
          disabled
          placeholder="Start Date"
        />
        <input
          type="date"
          style={dateInputStyles}
          disabled
          placeholder="End Date"
        />
      </div>

      {/* Empty State */}
      <div style={emptyStateStyles}>
        <span style={emptyIconStyles}>📋</span>
        <h3 style={emptyTitleStyles}>No Audit Entries</h3>
        <p style={emptyDescStyles}>
          Audit entries will appear here as actions are taken in the SEO domain.
          All actions are automatically logged for accountability.
        </p>
      </div>

      {/* Audit Entry Types */}
      <div style={typesStyles}>
        <h3 style={typesTitleStyles}>Tracked Actions</h3>
        <div style={typesGridStyles}>
          <ActionTypeCard
            icon="💡"
            label="Recommendation Generated"
            description="AI generates a new recommendation"
          />
          <ActionTypeCard
            icon="✅"
            label="Recommendation Approved"
            description="Human approves a recommendation"
          />
          <ActionTypeCard
            icon="❌"
            label="Recommendation Rejected"
            description="Human rejects with reason"
          />
          <ActionTypeCard
            icon="⏸️"
            label="Recommendation Deferred"
            description="Human defers for later"
          />
          <ActionTypeCard
            icon="📸"
            label="Snapshot Captured"
            description="Performance data recorded"
          />
          <ActionTypeCard
            icon="📄"
            label="Page Added"
            description="New page tracked"
          />
        </div>
      </div>

      {/* Entry Format Preview */}
      <div style={formatPreviewStyles}>
        <h4 style={formatTitleStyles}>Entry Format</h4>
        <div style={formatExampleStyles}>
          <code style={formatCodeStyles}>
{`{
  "id": "audit-entry-id",
  "action": "recommendation_approved",
  "entityType": "recommendation",
  "entityId": "rec-123",
  "userId": "user-456",
  "userDisplayName": "John Doe",
  "timestamp": "2024-01-15T10:30:00Z",
  "metadata": { ... },
  "previousState": { ... },
  "newState": { ... }
}`}
          </code>
        </div>
      </div>

      {/* Retention Notice */}
      <div style={retentionNoticeStyles}>
        <h4 style={retentionTitleStyles}>Data Retention</h4>
        <p style={retentionTextStyles}>
          Audit entries are immutable and retained indefinitely.
          They cannot be modified or deleted for compliance and learning purposes.
        </p>
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

interface ActionTypeCardProps {
  icon: string;
  label: string;
  description: string;
}

function ActionTypeCard({ icon, label, description }: ActionTypeCardProps) {
  return (
    <div style={actionTypeCardStyles}>
      <span style={actionTypeIconStyles}>{icon}</span>
      <div>
        <div style={actionTypeLabelStyles}>{label}</div>
        <div style={actionTypeDescStyles}>{description}</div>
      </div>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const containerStyles: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto',
};

const headerStyles: React.CSSProperties = {
  marginBottom: space['6'],
};

const h1Styles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.bold,
  color: text.primary,
  margin: 0,
};

const descStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  color: text.muted,
  marginTop: space['1'],
  margin: 0,
};

const filtersStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['3'],
  marginBottom: space['6'],
  flexWrap: 'wrap',
};

const selectStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: `${space['2']} ${space['3']}`,
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  backgroundColor: background.surface,
  color: text.muted,
};

const dateInputStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: `${space['2']} ${space['3']}`,
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  backgroundColor: background.surface,
  color: text.muted,
};

const emptyStateStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: space['12'],
  backgroundColor: background.surface,
  borderRadius: radius.xl,
  border: `1px solid ${border.default}`,
  textAlign: 'center',
  marginBottom: space['6'],
};

const emptyIconStyles: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: space['4'],
};

const emptyTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
};

const emptyDescStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  marginTop: space['2'],
  maxWidth: '400px',
  margin: `${space['2']} 0 0`,
};

const typesStyles: React.CSSProperties = {
  marginBottom: space['6'],
};

const typesTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
  marginBottom: space['4'],
};

const typesGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: space['3'],
};

const actionTypeCardStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['3'],
  padding: space['3'],
  backgroundColor: background.surface,
  borderRadius: radius.lg,
  border: `1px solid ${border.default}`,
};

const actionTypeIconStyles: React.CSSProperties = {
  fontSize: fontSize.xl,
};

const actionTypeLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: text.primary,
};

const actionTypeDescStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
  marginTop: space['0.5'],
};

const formatPreviewStyles: React.CSSProperties = {
  padding: space['4'],
  backgroundColor: background.muted,
  borderRadius: radius.lg,
  marginBottom: space['6'],
};

const formatTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
  marginBottom: space['3'],
};

const formatExampleStyles: React.CSSProperties = {
  backgroundColor: background.surface,
  padding: space['3'],
  borderRadius: radius.md,
  overflow: 'auto',
};

const formatCodeStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: text.secondary,
  whiteSpace: 'pre',
};

const retentionNoticeStyles: React.CSSProperties = {
  padding: space['4'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.lg,
  border: `1px solid ${semantic.info.base}20`,
};

const retentionTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: semantic.info.dark,
  margin: 0,
  marginBottom: space['2'],
};

const retentionTextStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  margin: 0,
};
