/**
 * OMS Action Panel
 * 
 * Phase 8B: Complete OMS action panel with entity context.
 * 
 * GOVERNANCE:
 * - Displays all permitted OMS actions for an entity
 * - Each action requires confirmation
 * - Shows loading/success/error states
 * - No bulk actions - one action at a time
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { 
  OMSActionType, 
  OMSEntityReference,
  OMSActionResponse,
} from '../../types/oms';
import { OMS_ACTIONS } from '../../types/oms';
import { OMSActionButton } from './OMSActionButton';
import { OMSConfirmationModal } from './OMSConfirmationModal';
import { OMSFeedback } from './OMSFeedback';
import {
  useAssignOwner,
  useAcknowledgeReview,
  useAdvanceLifecycleStage,
  useFlagException,
  useMarkReadyForHandoff,
} from '../../hooks/useOMS';
import { useOMSAccess, OMSActionGuard } from '../../hooks/useRBAC';

export interface OMSActionPanelProps {
  entity: OMSEntityReference;
  onActionComplete?: (action: OMSActionType, result: OMSActionResponse) => void;
}

export function OMSActionPanel({ entity, onActionComplete }: OMSActionPanelProps) {
  const access = useOMSAccess();
  
  // Action hooks
  const assignOwner = useAssignOwner();
  const acknowledgeReview = useAcknowledgeReview();
  const advanceLifecycleStage = useAdvanceLifecycleStage();
  const flagException = useFlagException();
  const markReadyForHandoff = useMarkReadyForHandoff();
  
  // UI state
  const [confirmAction, setConfirmAction] = useState<OMSActionType | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    action: OMSActionType;
    result?: OMSActionResponse;
    error?: string;
  } | null>(null);
  
  // Get loading state for current action
  const isLoading = (action: OMSActionType): boolean => {
    switch (action) {
      case 'assign_owner': return assignOwner.loading;
      case 'acknowledge_review': return acknowledgeReview.loading;
      case 'advance_lifecycle_stage': return advanceLifecycleStage.loading;
      case 'flag_exception': return flagException.loading;
      case 'mark_ready_for_handoff': return markReadyForHandoff.loading;
      default: return false;
    }
  };
  
  // Handle action button click - open confirmation
  const handleActionClick = useCallback((action: OMSActionType) => {
    setFeedback(null); // Clear previous feedback
    setConfirmAction(action);
  }, []);
  
  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    
    const action = confirmAction;
    setConfirmAction(null);
    
    try {
      let result: OMSActionResponse;
      
      switch (action) {
        case 'assign_owner':
          // For demo purposes, using a placeholder owner
          // In production, this would come from a user picker
          result = await assignOwner.execute({
            entityId: entity.id,
            entityType: entity.type,
            ownerId: 'current-user', // Would be selected by user
          });
          break;
          
        case 'acknowledge_review':
          result = await acknowledgeReview.execute({
            entityId: entity.id,
            entityType: entity.type,
          });
          break;
          
        case 'advance_lifecycle_stage':
          result = await advanceLifecycleStage.execute({
            entityId: entity.id,
            entityType: entity.type,
          });
          break;
          
        case 'flag_exception':
          result = await flagException.execute({
            entityId: entity.id,
            entityType: entity.type,
            reason: 'Flagged via OMS', // Would come from user input
          });
          break;
          
        case 'mark_ready_for_handoff':
          result = await markReadyForHandoff.execute({
            entityId: entity.id,
            entityType: entity.type,
          });
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      setFeedback({ type: 'success', action, result });
      onActionComplete?.(action, result);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      setFeedback({ type: 'error', action, error: errorMessage });
    }
  }, [
    confirmAction, 
    entity, 
    assignOwner, 
    acknowledgeReview, 
    advanceLifecycleStage, 
    flagException, 
    markReadyForHandoff,
    onActionComplete,
  ]);
  
  // Handle cancel
  const handleCancel = useCallback(() => {
    setConfirmAction(null);
  }, []);
  
  // Handle feedback dismiss
  const handleDismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);
  
  // Check if any action is loading
  const anyLoading = 
    assignOwner.loading || 
    acknowledgeReview.loading || 
    advanceLifecycleStage.loading || 
    flagException.loading || 
    markReadyForHandoff.loading;
  
  if (!access.canViewOMS) {
    return null;
  }
  
  return (
    <div style={panelStyles}>
      {/* Panel Header */}
      <div style={headerStyles}>
        <h3 style={titleStyles}>OMS Actions</h3>
        <span style={badgeStyles}>Manual Action</span>
      </div>
      
      {/* Entity Info */}
      <div style={entityInfoStyles}>
        <span style={entityTypeStyles}>{entity.type}</span>
        <span style={entityNameStyles}>{entity.displayName}</span>
        {entity.currentStage && (
          <span style={entityStageStyles}>Stage: {entity.currentStage}</span>
        )}
      </div>
      
      {/* Feedback */}
      {feedback && (
        <OMSFeedback
          type={feedback.type}
          action={feedback.action}
          result={feedback.result}
          error={feedback.error}
          onDismiss={handleDismissFeedback}
        />
      )}
      
      {/* Actions */}
      <div style={actionsContainerStyles}>
        <OMSActionGuard action="assign_owner">
          <OMSActionButton
            action="assign_owner"
            onClick={() => handleActionClick('assign_owner')}
            loading={assignOwner.loading}
            disabled={anyLoading && !assignOwner.loading}
          />
        </OMSActionGuard>
        
        <OMSActionGuard action="acknowledge_review">
          <OMSActionButton
            action="acknowledge_review"
            onClick={() => handleActionClick('acknowledge_review')}
            loading={acknowledgeReview.loading}
            disabled={anyLoading && !acknowledgeReview.loading}
          />
        </OMSActionGuard>
        
        <OMSActionGuard action="advance_lifecycle_stage">
          <OMSActionButton
            action="advance_lifecycle_stage"
            onClick={() => handleActionClick('advance_lifecycle_stage')}
            loading={advanceLifecycleStage.loading}
            disabled={anyLoading && !advanceLifecycleStage.loading}
          />
        </OMSActionGuard>
        
        <OMSActionGuard action="flag_exception">
          <OMSActionButton
            action="flag_exception"
            onClick={() => handleActionClick('flag_exception')}
            loading={flagException.loading}
            disabled={anyLoading && !flagException.loading}
          />
        </OMSActionGuard>
        
        <OMSActionGuard action="mark_ready_for_handoff">
          <OMSActionButton
            action="mark_ready_for_handoff"
            onClick={() => handleActionClick('mark_ready_for_handoff')}
            loading={markReadyForHandoff.loading}
            disabled={anyLoading && !markReadyForHandoff.loading}
          />
        </OMSActionGuard>
      </div>
      
      {/* Confirmation Modal */}
      <OMSConfirmationModal
        isOpen={confirmAction !== null}
        action={confirmAction}
        entityName={entity.displayName}
        loading={confirmAction !== null && isLoading(confirmAction)}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

// ============================================
// Styles
// ============================================

const panelStyles: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px',
};

const titleStyles: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
  margin: 0,
};

const badgeStyles: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  color: '#7c3aed',
  backgroundColor: '#ede9fe',
  padding: '4px 8px',
  borderRadius: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const entityInfoStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '1px solid #f3f4f6',
};

const entityTypeStyles: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: '#6b7280',
  backgroundColor: '#f3f4f6',
  padding: '4px 8px',
  borderRadius: '4px',
  textTransform: 'capitalize',
};

const entityNameStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#111827',
};

const entityStageStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  marginLeft: 'auto',
};

const actionsContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
};
