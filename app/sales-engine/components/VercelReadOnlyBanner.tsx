'use client';

/**
 * VercelReadOnlyBanner - M67.9-01 Global Read-Only Mode Banner + M68-02/03 Runtime Status
 * 
 * Displays a non-dismissable banner when the application is in read-only mode.
 * This is shown globally at the top of all pages when:
 * - NEXT_PUBLIC_READ_ONLY=true
 * - NEXT_PUBLIC_API_MODE=disabled
 * 
 * M68-02: Also shows runtime permitted status when canRuntimeExecute() is true.
 * M68-03: Shows kill switch status when RUNTIME_KILL_SWITCH=true.
 * 
 * HARD CONSTRAINTS:
 * - Cannot be dismissed by the user
 * - Must be visible on all pages
 * - Clearly communicates read-only state OR runtime permitted state OR kill switch
 */

import { 
  isReadOnly, 
  isApiDisabled, 
  READ_ONLY_BANNER_MESSAGE,
  canRuntimeExecute,
  RUNTIME_PERMITTED_MESSAGE,
  isRuntimeKillSwitchActive,
  KILL_SWITCH_MESSAGE,
} from '../../../config/appConfig';
import { NSD_COLORS, NSD_TYPOGRAPHY, NSD_RADIUS } from '../lib/design-tokens';

interface VercelReadOnlyBannerProps {
  /** Override the default message */
  message?: string;
}

export function VercelReadOnlyBanner({ 
  message = READ_ONLY_BANNER_MESSAGE 
}: VercelReadOnlyBannerProps) {
  const runtimePermitted = canRuntimeExecute();
  
  // M68-03: Kill switch takes priority - show red banner
  if (isRuntimeKillSwitchActive) {
    return (
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: '12px 24px',
          backgroundColor: '#FEE2E2', // Red background for kill switch
          borderBottom: '1px solid #FECACA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
        role="alert"
        aria-live="assertive"
      >
        <StopIcon />
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#991B1B',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            {KILL_SWITCH_MESSAGE}
          </span>
        </div>
      </div>
    );
  }
  
  // M68-02: Show runtime permitted banner if runtime is enabled
  if (runtimePermitted) {
    return (
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: '12px 24px',
          backgroundColor: '#DCFCE7', // Green background for runtime permitted
          borderBottom: '1px solid #86EFAC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
        role="status"
        aria-live="polite"
      >
        <PlayIcon />
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#166534',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            {RUNTIME_PERMITTED_MESSAGE}
          </span>
        </div>
      </div>
    );
  }

  // Only show read-only banner when in read-only mode
  if (!isReadOnly) {
    return null;
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '12px 24px',
        backgroundColor: '#FEF3C7',
        borderBottom: '1px solid #FCD34D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}
      role="alert"
      aria-live="polite"
    >
      <LockIcon />
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#92400E',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          {message}
        </span>
        {isApiDisabled && (
          <span
            style={{
              marginLeft: '12px',
              fontSize: '12px',
              color: '#B45309',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            No API connections active.
          </span>
        )}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#92400E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#166534"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#991B1B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

export default VercelReadOnlyBanner;
