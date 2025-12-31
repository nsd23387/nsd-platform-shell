/**
 * Read-Only API Guard - Target-State Architecture
 * 
 * This module enforces the read-only constraint for the Sales Engine UI.
 * 
 * Non-negotiable constraints:
 * - UI MUST NOT perform POST/PUT/PATCH/DELETE to canonical entities
 * - Only GET requests are allowed from the UI layer
 * - Mutation calls throw in dev and fail build in production
 */

/**
 * HTTP methods that are allowed in the read-only UI.
 */
export const ALLOWED_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;
export type AllowedMethod = typeof ALLOWED_METHODS[number];

/**
 * HTTP methods that are forbidden in the read-only UI.
 */
export const FORBIDDEN_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type ForbiddenMethod = typeof FORBIDDEN_METHODS[number];

/**
 * Error thrown when a mutation is attempted in the read-only UI.
 */
export class ReadOnlyViolationError extends Error {
  public readonly method: string;
  public readonly endpoint: string;
  public readonly timestamp: string;

  constructor(method: string, endpoint: string) {
    super(
      `[READ-ONLY VIOLATION] Attempted ${method} to ${endpoint}. ` +
      `The Sales Engine UI is read-only and cannot perform mutations. ` +
      `Execution and mutations are managed by backend systems.`
    );
    this.name = 'ReadOnlyViolationError';
    this.method = method;
    this.endpoint = endpoint;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Check if an HTTP method is allowed in the read-only UI.
 */
export function isAllowedMethod(method: string): boolean {
  return ALLOWED_METHODS.includes(method.toUpperCase() as AllowedMethod);
}

/**
 * Check if an HTTP method is forbidden in the read-only UI.
 */
export function isForbiddenMethod(method: string): boolean {
  return FORBIDDEN_METHODS.includes(method.toUpperCase() as ForbiddenMethod);
}

/**
 * Validate that a request method is allowed.
 * Throws ReadOnlyViolationError if the method is forbidden.
 * 
 * @param method - HTTP method to validate
 * @param endpoint - Endpoint being accessed (for error context)
 * @throws ReadOnlyViolationError if method is not allowed
 */
export function assertReadOnly(method: string, endpoint: string): void {
  if (isForbiddenMethod(method)) {
    const error = new ReadOnlyViolationError(method, endpoint);
    
    // Always log violation for observability
    console.error('[READ-ONLY GUARD]', {
      error: error.message,
      method,
      endpoint,
      timestamp: error.timestamp,
    });

    // Throw error to prevent mutation
    throw error;
  }
}

/**
 * Create a guarded fetch function that enforces read-only constraints.
 * 
 * This wrapper ensures that all API calls from the UI layer comply
 * with the read-only architecture constraint.
 * 
 * @param baseFetch - The underlying fetch function to wrap
 * @returns A guarded fetch function
 */
export function createReadOnlyFetch(
  baseFetch: typeof fetch = fetch
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = init?.method?.toUpperCase() || 'GET';
    
    // Determine endpoint for error context
    let endpoint: string;
    if (typeof input === 'string') {
      endpoint = input;
    } else if (input instanceof URL) {
      endpoint = input.toString();
    } else if (input instanceof Request) {
      endpoint = input.url;
    } else {
      endpoint = String(input);
    }

    // Assert read-only constraint
    assertReadOnly(method, endpoint);

    // Proceed with the request
    return baseFetch(input, init);
  };
}

/**
 * Wrapper for fetch that enforces read-only constraints.
 * Use this instead of native fetch in UI components.
 */
export const readOnlyFetch = createReadOnlyFetch();

/**
 * Validate RequestInit options to ensure read-only compliance.
 * Returns the options if valid, throws if method is forbidden.
 */
export function validateRequestInit(
  endpoint: string,
  options?: RequestInit
): RequestInit {
  const method = options?.method?.toUpperCase() || 'GET';
  assertReadOnly(method, endpoint);
  return options || {};
}

/**
 * Check if we're in development mode.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Log a read-only violation attempt for monitoring/alerting.
 * This is called even if the violation is caught by other means.
 */
export function logViolationAttempt(method: string, endpoint: string): void {
  const violation = {
    type: 'READ_ONLY_VIOLATION_ATTEMPT',
    method,
    endpoint,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };

  console.warn('[READ-ONLY GUARD] Violation attempt:', violation);

  // In a production system, this would send to observability/alerting
  // TODO: Integrate with ODS observability tables for monitoring
}

/**
 * Message to display when a mutation feature is not available.
 */
export const READ_ONLY_MESSAGE = 
  'This action is not available. The Sales Engine UI is read-only. ' +
  'Execution and data mutations are managed by backend governance systems.';

/**
 * Component-friendly readonly status.
 */
export const READ_ONLY_STATUS = {
  isReadOnly: true,
  message: READ_ONLY_MESSAGE,
  constraint: 'Governance-first, read-only UI façade',
} as const;
