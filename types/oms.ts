/**
 * OMS (Operations Management System) Types
 * 
 * Phase 8B: UI-Only Controlled Mutations
 * 
 * GOVERNANCE:
 * - Exactly 5 OMS actions are permitted
 * - Each action maps to exactly one backend endpoint
 * - Each action emits exactly one canonical activity event
 * - No additional actions may be added without governance review
 * 
 * OMS Actions:
 * 1. Assign Owner        → entity.assigned
 * 2. Acknowledge Review  → entity.reviewed
 * 3. Advance Lifecycle   → entity.stage_advanced
 * 4. Flag Exception      → entity.exception_flagged
 * 5. Mark Ready          → entity.ready_for_handoff
 */

// ============================================
// OMS Action Types
// ============================================

/**
 * Canonical OMS action identifiers.
 * These map exactly to backend endpoints.
 */
export type OMSActionType =
  | 'assign_owner'
  | 'acknowledge_review'
  | 'advance_lifecycle_stage'
  | 'flag_exception'
  | 'mark_ready_for_handoff';

/**
 * OMS action metadata for UI rendering.
 */
export interface OMSActionConfig {
  type: OMSActionType;
  label: string;
  description: string;
  confirmationMessage: string;
  successMessage: string;
  icon: string;
  variant: 'default' | 'primary' | 'warning' | 'danger';
}

/**
 * All permitted OMS actions with their configurations.
 * This is the authoritative list - no others are allowed.
 */
export const OMS_ACTIONS: Record<OMSActionType, OMSActionConfig> = {
  assign_owner: {
    type: 'assign_owner',
    label: 'Assign Owner',
    description: 'Assign an owner to this entity',
    confirmationMessage: 'Are you sure you want to assign this owner?',
    successMessage: 'Owner assigned successfully',
    icon: '👤',
    variant: 'primary',
  },
  acknowledge_review: {
    type: 'acknowledge_review',
    label: 'Acknowledge Review',
    description: 'Acknowledge that this entity has been reviewed',
    confirmationMessage: 'Are you sure you want to acknowledge this review?',
    successMessage: 'Review acknowledged successfully',
    icon: '✓',
    variant: 'primary',
  },
  advance_lifecycle_stage: {
    type: 'advance_lifecycle_stage',
    label: 'Advance Stage',
    description: 'Advance this entity to the next lifecycle stage',
    confirmationMessage: 'Are you sure you want to advance to the next stage?',
    successMessage: 'Stage advanced successfully',
    icon: '→',
    variant: 'primary',
  },
  flag_exception: {
    type: 'flag_exception',
    label: 'Flag Exception',
    description: 'Flag this entity as having an exception',
    confirmationMessage: 'Are you sure you want to flag this exception?',
    successMessage: 'Exception flagged successfully',
    icon: '⚠️',
    variant: 'warning',
  },
  mark_ready_for_handoff: {
    type: 'mark_ready_for_handoff',
    label: 'Mark Ready for Handoff',
    description: 'Mark this entity as ready for handoff',
    confirmationMessage: 'Are you sure you want to mark this as ready for handoff?',
    successMessage: 'Marked ready for handoff successfully',
    icon: '📤',
    variant: 'primary',
  },
};

// ============================================
// Entity Types (for OMS operations)
// ============================================

/**
 * Entity types that can be operated on via OMS.
 */
export type OMSEntityType = 'order' | 'quote' | 'mockup' | 'media';

/**
 * Minimal entity reference for OMS operations.
 * The UI receives these from read endpoints - no local fabrication.
 */
export interface OMSEntityReference {
  id: string;
  type: OMSEntityType;
  displayName: string;
  currentStage?: string;
  currentOwner?: string;
}

// ============================================
// OMS Request/Response Types
// ============================================

/**
 * Base request for all OMS actions.
 */
export interface OMSActionRequest {
  entityId: string;
  entityType: OMSEntityType;
}

/**
 * Request for Assign Owner action.
 */
export interface AssignOwnerRequest extends OMSActionRequest {
  ownerId: string;
  ownerName?: string;
}

/**
 * Request for Acknowledge Review action.
 */
export interface AcknowledgeReviewRequest extends OMSActionRequest {
  notes?: string;
}

/**
 * Request for Advance Lifecycle Stage action.
 */
export interface AdvanceLifecycleStageRequest extends OMSActionRequest {
  targetStage?: string; // If not provided, advances to next stage
}

/**
 * Request for Flag Exception action.
 */
export interface FlagExceptionRequest extends OMSActionRequest {
  reason: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Request for Mark Ready for Handoff action.
 */
export interface MarkReadyForHandoffRequest extends OMSActionRequest {
  notes?: string;
}

/**
 * Standard OMS action response.
 * All OMS actions return this structure.
 */
export interface OMSActionResponse {
  success: boolean;
  eventId: string; // ID of the emitted activity event
  entityId: string;
  entityType: OMSEntityType;
  action: OMSActionType;
  timestamp: string;
  message?: string;
}

/**
 * OMS action error response.
 */
export interface OMSActionError {
  success: false;
  error: string;
  code?: string;
  entityId?: string;
  action?: OMSActionType;
}

// ============================================
// OMS UI State Types
// ============================================

/**
 * State for an OMS action execution.
 */
export interface OMSActionState {
  loading: boolean;
  error: string | null;
  lastResult: OMSActionResponse | null;
}

/**
 * Confirmation dialog state.
 */
export interface OMSConfirmationState {
  isOpen: boolean;
  action: OMSActionType | null;
  entity: OMSEntityReference | null;
}

// ============================================
// OMS Permission Types
// ============================================

/**
 * OMS permission strings.
 * These are checked against bootstrap.permissions.
 */
export const OMS_PERMISSIONS = {
  view: 'oms:view',
  assign_owner: 'oms:action:assign_owner',
  acknowledge_review: 'oms:action:acknowledge_review',
  advance_lifecycle_stage: 'oms:action:advance_lifecycle_stage',
  flag_exception: 'oms:action:flag_exception',
  mark_ready_for_handoff: 'oms:action:mark_ready_for_handoff',
} as const;

export type OMSPermission = typeof OMS_PERMISSIONS[keyof typeof OMS_PERMISSIONS];
