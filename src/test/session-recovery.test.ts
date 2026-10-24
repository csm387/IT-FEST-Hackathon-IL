import { describe, expect, it, vi } from 'vitest';
import { SessionExpiredError, withSessionRecovery } from '@/lib/session-recovery';

describe('authenticated page session recovery', () => {
  it('refreshes an invalid token once and reads the saved data again', async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error('Unauthorized: Invalid token')).mockResolvedValueOnce({ sites: ['saved-site'] });
    const refresh = vi.fn().mockResolvedValue(true);
    const clear = vi.fn();
    await expect(withSessionRecovery(operation, refresh, clear)).resolves.toEqual({ sites: ['saved-site'] });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(clear).not.toHaveBeenCalled();
  });

  it('clears an expired session when refresh is rejected', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Unauthorized: Invalid token'));
    const clear = vi.fn().mockResolvedValue(undefined);
    await expect(withSessionRecovery(operation, async () => false, clear)).rejects.toBeInstanceOf(SessionExpiredError);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('does not loop when a refreshed session is still rejected', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Unauthorized: Invalid token'));
    const refresh = vi.fn().mockResolvedValue(true);
    const clear = vi.fn().mockResolvedValue(undefined);
    await expect(withSessionRecovery(operation, refresh, clear)).rejects.toBeInstanceOf(SessionExpiredError);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('preserves data errors without refreshing or clearing the session', async () => {
    const error = new Error('Database unavailable');
    const refresh = vi.fn();
    const clear = vi.fn();
    await expect(withSessionRecovery(async () => { throw error; }, refresh, clear)).rejects.toBe(error);
    expect(refresh).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
});