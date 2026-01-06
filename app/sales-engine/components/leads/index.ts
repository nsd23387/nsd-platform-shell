/**
 * Lead Components
 * 
 * UI components for lead approval workflow.
 * 
 * BACKEND ENFORCEMENT (authoritative):
 * - Leads start as pending_approval
 * - Only approved leads can be sent/exported
 * - Approval/rejection are explicit actions
 * - UI reflects this state, does not auto-approve
 * 
 * COPY ALIGNMENT:
 * - pending_approval → "Awaiting approval"
 * - approved → "Approved for outreach"
 * - rejected → "Rejected"
 * 
 * No "Qualified" labels, no "Ready to send" buttons.
 */

export { LeadStatusBadge } from './LeadStatusBadge';
export type { LeadStatusBadgeProps } from './LeadStatusBadge';

export { ApprovalConfirmationModal } from './ApprovalConfirmationModal';
export type { ApprovalConfirmationModalProps } from './ApprovalConfirmationModal';

export { LeadApprovalActions } from './LeadApprovalActions';
export type { LeadApprovalActionsProps } from './LeadApprovalActions';

export { BulkApprovalPanel } from './BulkApprovalPanel';
export type { BulkApprovalPanelProps } from './BulkApprovalPanel';
