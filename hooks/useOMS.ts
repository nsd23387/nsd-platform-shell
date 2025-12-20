/**
 * OMS Hooks - Phase 8B
 * 
 * Provides React hooks for OMS mutation actions.
 * 
 * GOVERNANCE:
 * - Each hook wraps exactly one backend mutation
 * - No optimistic updates - state reflects backend truth
 * - No automatic retries - explicit user action required
 * - No client-side state inference
 * - Success/failure determined solely by backend response
 */

'use client';

import { useState, useCallback } from 'react';
import type {
  OMSActionType,
  OMSActionResponse,
  OMSActionState,
  AssignOwnerRequest,
  AcknowledgeReviewRequest,
  AdvanceLifecycleStageRequest,
  FlagExceptionRequest,
  MarkReadyForHandoffRequest,
  OMSEntityReference,
} from '../types/oms';
import {
  assignOwner as assignOwnerSDK,
  acknowledgeReview as acknowledgeReviewSDK,
  advanceLifecycleStage as advanceLifecycleStageSDK,
  flagException as flagExceptionSDK,
  markReadyForHandoff as markReadyForHandoffSDK,
} from '../lib/sdk';

// ============================================
// Generic OMS Action Hook
// ============================================

interface UseOMSActionResult<TRequest> {
  execute: (request: TRequest) => Promise<OMSActionResponse>;
  loading: boolean;
  error: string | null;
  lastResult: OMSActionResponse | null;
  reset: () => void;
}

/**
 * Generic hook factory for OMS actions.
 * Wraps SDK functions with loading/error state management.
 */
function useOMSAction<TRequest>(
  actionFn: (request: TRequest) => Promise<OMSActionResponse>,
  actionType: OMSActionType
): UseOMSActionResult<TRequest> {
  const [state, setState] = useState<OMSActionState>({
    loading: false,
    error: null,
    lastResult: null,
  });

  const execute = useCallback(async (request: TRequest): Promise<OMSActionResponse> => {
    setState({ loading: true, error: null, lastResult: null });
    
    try {
      const result = await actionFn(request);
      setState({ loading: false, error: null, lastResult: result });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `${actionType} failed`;
      setState({ loading: false, error: errorMessage, lastResult: null });
      throw err;
    }
  }, [actionFn, actionType]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, lastResult: null });
  }, []);

  return {
    execute,
    loading: state.loading,
    error: state.error,
    lastResult: state.lastResult,
    reset,
  };
}

// ============================================
// Individual OMS Action Hooks
// ============================================

/**
 * Hook for Assign Owner action.
 * 
 * Usage:
 * const { execute, loading, error } = useAssignOwner();
 * await execute({ entityId, entityType, ownerId });
 */
export function useAssignOwner() {
  return useOMSAction<AssignOwnerRequest>(assignOwnerSDK, 'assign_owner');
}

/**
 * Hook for Acknowledge Review action.
 * 
 * Usage:
 * const { execute, loading, error } = useAcknowledgeReview();
 * await execute({ entityId, entityType, notes? });
 */
export function useAcknowledgeReview() {
  return useOMSAction<AcknowledgeReviewRequest>(acknowledgeReviewSDK, 'acknowledge_review');
}

/**
 * Hook for Advance Lifecycle Stage action.
 * 
 * Usage:
 * const { execute, loading, error } = useAdvanceLifecycleStage();
 * await execute({ entityId, entityType, targetStage? });
 */
export function useAdvanceLifecycleStage() {
  return useOMSAction<AdvanceLifecycleStageRequest>(advanceLifecycleStageSDK, 'advance_lifecycle_stage');
}

/**
 * Hook for Flag Exception action.
 * 
 * Usage:
 * const { execute, loading, error } = useFlagException();
 * await execute({ entityId, entityType, reason, severity? });
 */
export function useFlagException() {
  return useOMSAction<FlagExceptionRequest>(flagExceptionSDK, 'flag_exception');
}

/**
 * Hook for Mark Ready for Handoff action.
 * 
 * Usage:
 * const { execute, loading, error } = useMarkReadyForHandoff();
 * await execute({ entityId, entityType, notes? });
 */
export function useMarkReadyForHandoff() {
  return useOMSAction<MarkReadyForHandoffRequest>(markReadyForHandoffSDK, 'mark_ready_for_handoff');
}

// ============================================
// Confirmation Dialog Hook
// ============================================

interface ConfirmationState {
  isOpen: boolean;
  action: OMSActionType | null;
  entity: OMSEntityReference | null;
  additionalData: Record<string, unknown> | null;
}

interface UseOMSConfirmationResult {
  state: ConfirmationState;
  requestConfirmation: (
    action: OMSActionType,
    entity: OMSEntityReference,
    additionalData?: Record<string, unknown>
  ) => void;
  confirm: () => void;
  cancel: () => void;
  onConfirm: (callback: () => void) => void;
}

/**
 * Hook for managing OMS action confirmation dialogs.
 * 
 * GOVERNANCE:
 * - Every OMS action MUST be confirmed before execution
 * - No automatic execution
 * - User must explicitly confirm each mutation
 */
export function useOMSConfirmation(): UseOMSConfirmationResult {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    action: null,
    entity: null,
    additionalData: null,
  });

  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  const requestConfirmation = useCallback((
    action: OMSActionType,
    entity: OMSEntityReference,
    additionalData?: Record<string, unknown>
  ) => {
    setState({
      isOpen: true,
      action,
      entity,
      additionalData: additionalData ?? null,
    });
  }, []);

  const confirm = useCallback(() => {
    if (confirmCallback) {
      confirmCallback();
    }
    setState({
      isOpen: false,
      action: null,
      entity: null,
      additionalData: null,
    });
    setConfirmCallback(null);
  }, [confirmCallback]);

  const cancel = useCallback(() => {
    setState({
      isOpen: false,
      action: null,
      entity: null,
      additionalData: null,
    });
    setConfirmCallback(null);
  }, []);

  const onConfirm = useCallback((callback: () => void) => {
    setConfirmCallback(() => callback);
  }, []);

  return {
    state,
    requestConfirmation,
    confirm,
    cancel,
    onConfirm,
  };
}

// ============================================
// Combined OMS Actions Hook
// ============================================

/**
 * Combined hook providing all OMS actions.
 * Useful when a component needs access to multiple actions.
 */
export function useOMSActions() {
  const assignOwner = useAssignOwner();
  const acknowledgeReview = useAcknowledgeReview();
  const advanceLifecycleStage = useAdvanceLifecycleStage();
  const flagException = useFlagException();
  const markReadyForHandoff = useMarkReadyForHandoff();

  return {
    assignOwner,
    acknowledgeReview,
    advanceLifecycleStage,
    flagException,
    markReadyForHandoff,
  };
}
