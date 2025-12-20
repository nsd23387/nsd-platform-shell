/**
 * OMS Dashboard Page
 * 
 * Phase 8B: UI-Only Controlled Mutations
 * 
 * GOVERNANCE:
 * - Exactly 5 OMS actions are permitted
 * - Each action requires explicit confirmation
 * - Each action calls exactly one backend endpoint
 * - Each action emits exactly one activity event
 * - No bulk actions, no automation
 * - RBAC enforced at UI layer
 * 
 * This is the first intentional write surface for humans.
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { 
  OMSEntityReference, 
  OMSActionType,
  OMSActionResponse,
} from '../../../types/oms';
import { OMSActionPanel } from '../../../components/oms';
import { OMSGuard, useOMSAccess } from '../../../hooks/useRBAC';
import { DashboardSection } from '../../../components/dashboard';

// ============================================
// Sample Entities (Read from backend in production)
// ============================================

/**
 * Sample entities for demonstration.
 * In production, these would come from a read-only API endpoint.
 * The OMS UI does NOT fabricate entities - they come from the backend.
 */
const SAMPLE_ENTITIES: OMSEntityReference[] = [
  {
    id: 'order-001',
    type: 'order',
    displayName: 'Order #2024-001',
    currentStage: 'processing',
    currentOwner: 'unassigned',
  },
  {
    id: 'quote-002',
    type: 'quote',
    displayName: 'Quote #Q-2024-002',
    currentStage: 'pending_review',
    currentOwner: 'john.doe',
  },
  {
    id: 'mockup-003',
    type: 'mockup',
    displayName: 'Mockup #M-2024-003',
    currentStage: 'in_progress',
    currentOwner: 'jane.smith',
  },
];

// ============================================
// Main Component
// ============================================

export default function OMSDashboard() {
  const access = useOMSAccess();
  const [recentActions, setRecentActions] = useState<Array<{
    action: OMSActionType;
    entityId: string;
    timestamp: string;
    eventId: string;
  }>>([]);
  
  // Track completed actions for observability
  const handleActionComplete = useCallback((
    action: OMSActionType, 
    result: OMSActionResponse
  ) => {
    setRecentActions(prev => [{
      action,
      entityId: result.entityId,
      timestamp: result.timestamp,
      eventId: result.eventId,
    }, ...prev.slice(0, 4)]); // Keep last 5
  }, []);

  return (
    <OMSGuard fallback={<AccessDenied />}>
      <div>
        {/* Header */}
        <OMSHeader />
        
        {/* Governance Notice */}
        <GovernanceNotice />
        
        {/* Recent Actions (Observability) */}
        {recentActions.length > 0 && (
          <RecentActionsPanel actions={recentActions} />
        )}
        
        {/* Entity Panels */}
        <DashboardSection 
          title="Entities" 
          description="Select an entity to perform OMS actions"
        >
          {SAMPLE_ENTITIES.map(entity => (
            <OMSActionPanel
              key={entity.id}
              entity={entity}
              onActionComplete={handleActionComplete}
            />
          ))}
        </DashboardSection>
        
        {/* Permissions Summary */}
        <PermissionsSummary access={access} />
      </div>
    </OMSGuard>
  );
}

// ============================================
// Header Component
// ============================================

function OMSHeader() {
  return (
    <div style={headerStyles}>
      <div>
        <h1 style={titleStyles}>Operations Management System</h1>
        <p style={subtitleStyles}>
          Controlled mutations for entity lifecycle management
        </p>
      </div>
      <div style={headerBadgeStyles}>
        <span style={manualBadgeStyles}>⚡ Manual Actions Only</span>
      </div>
    </div>
  );
}

// ============================================
// Governance Notice
// ============================================

function GovernanceNotice() {
  return (
    <div style={noticeStyles}>
      <div style={noticeHeaderStyles}>
        <span style={{ fontSize: '18px' }}>📋</span>
        <span style={noticeTitleStyles}>Governance Rules</span>
      </div>
      <ul style={noticeListStyles}>
        <li>Each action requires explicit confirmation</li>
        <li>Each action emits exactly one activity event</li>
        <li>All actions are immediately observable in dashboards</li>
        <li>No bulk actions or automation permitted</li>
        <li>Actions cannot be undone - corrections require new actions</li>
      </ul>
    </div>
  );
}

// ============================================
// Recent Actions Panel
// ============================================

interface RecentActionsPanelProps {
  actions: Array<{
    action: OMSActionType;
    entityId: string;
    timestamp: string;
    eventId: string;
  }>;
}

function RecentActionsPanel({ actions }: RecentActionsPanelProps) {
  return (
    <div style={recentPanelStyles}>
      <h3 style={recentTitleStyles}>Recent Actions</h3>
      <p style={recentSubtitleStyles}>
        These events have been emitted and should appear in dashboards
      </p>
      <div style={recentListStyles}>
        {actions.map((action, index) => (
          <div key={index} style={recentItemStyles}>
            <span style={recentActionStyles}>{action.action}</span>
            <span style={recentEntityStyles}>{action.entityId}</span>
            <span style={recentEventStyles}>
              Event: <code>{action.eventId.slice(0, 8)}...</code>
            </span>
            <span style={recentTimeStyles}>
              {new Date(action.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Permissions Summary
// ============================================

interface PermissionsSummaryProps {
  access: ReturnType<typeof useOMSAccess>;
}

function PermissionsSummary({ access }: PermissionsSummaryProps) {
  return (
    <div style={permissionsStyles}>
      <h4 style={permissionsTitleStyles}>Your OMS Permissions</h4>
      <div style={permissionsGridStyles}>
        <PermissionBadge 
          label="View OMS" 
          granted={access.canViewOMS} 
        />
        <PermissionBadge 
          label="Assign Owner" 
          granted={access.canAssignOwner} 
        />
        <PermissionBadge 
          label="Acknowledge Review" 
          granted={access.canAcknowledgeReview} 
        />
        <PermissionBadge 
          label="Advance Stage" 
          granted={access.canAdvanceLifecycleStage} 
        />
        <PermissionBadge 
          label="Flag Exception" 
          granted={access.canFlagException} 
        />
        <PermissionBadge 
          label="Mark Ready" 
          granted={access.canMarkReadyForHandoff} 
        />
      </div>
    </div>
  );
}

interface PermissionBadgeProps {
  label: string;
  granted: boolean;
}

function PermissionBadge({ label, granted }: PermissionBadgeProps) {
  return (
    <div style={badgeContainerStyles(granted)}>
      <span style={{ marginRight: '6px' }}>{granted ? '✓' : '✗'}</span>
      <span>{label}</span>
    </div>
  );
}

// ============================================
// Access Denied
// ============================================

function AccessDenied() {
  return (
    <div style={accessDeniedStyles}>
      <span style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</span>
      <h2 style={{ fontSize: '20px', color: '#374151', marginBottom: '8px' }}>
        OMS Access Denied
      </h2>
      <p style={{ color: '#6b7280' }}>
        You do not have permission to access the Operations Management System.
      </p>
      <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '16px' }}>
        Contact your administrator if you believe this is an error.
      </p>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '24px',
  paddingBottom: '24px',
  borderBottom: '1px solid #e5e7eb',
};

const titleStyles: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#111827',
  marginBottom: '4px',
};

const subtitleStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
};

const headerBadgeStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const manualBadgeStyles: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#7c3aed',
  backgroundColor: '#ede9fe',
  padding: '8px 16px',
  borderRadius: '8px',
};

const noticeStyles: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
};

const noticeHeaderStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
};

const noticeTitleStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#92400e',
};

const noticeListStyles: React.CSSProperties = {
  margin: 0,
  paddingLeft: '20px',
  fontSize: '13px',
  color: '#92400e',
  lineHeight: 1.8,
};

const recentPanelStyles: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
};

const recentTitleStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#166534',
  marginBottom: '4px',
};

const recentSubtitleStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#15803d',
  marginBottom: '12px',
};

const recentListStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const recentItemStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '8px 12px',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  fontSize: '13px',
};

const recentActionStyles: React.CSSProperties = {
  fontWeight: 500,
  color: '#166534',
  minWidth: '180px',
};

const recentEntityStyles: React.CSSProperties = {
  color: '#374151',
  minWidth: '120px',
};

const recentEventStyles: React.CSSProperties = {
  color: '#6b7280',
  fontFamily: 'monospace',
  fontSize: '11px',
};

const recentTimeStyles: React.CSSProperties = {
  color: '#9ca3af',
  marginLeft: 'auto',
  fontSize: '12px',
};

const permissionsStyles: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px',
  marginTop: '24px',
};

const permissionsTitleStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '12px',
};

const permissionsGridStyles: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const badgeContainerStyles = (granted: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  backgroundColor: granted ? '#dcfce7' : '#fef2f2',
  color: granted ? '#166534' : '#dc2626',
});

const accessDeniedStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '400px',
  textAlign: 'center',
};
