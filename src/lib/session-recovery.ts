export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
    this.name = 'SessionExpiredError';
  }
}

export function isSessionError(error: unknown): boolean {
  if (error instanceof SessionExpiredError) return true;
  if (!(error instanceof Error)) return false;
  return /unauthorized|invalid (?:jwt|token)|jwt expired|session.*expired/i.test(error.message);
}

/** Retry only authentication failures, once, with a freshly verified session. */
export async function withSessionRecovery<T>(
  operation: () => Promise<T>,
  refresh: () => Promise<boolean>,
  clearSession: () => Promise<void>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isSessionError(error)) throw error;
  }

  let refreshed = false;
  try { refreshed = await refresh(); } catch { /* Require a new sign-in. */ }
  if (refreshed) {
    try {
      return await operation();
    } catch (error) {
      if (!isSessionError(error)) throw error;
    }
  }
  await clearSession();
  throw new SessionExpiredError();
}