/**
 * Adapts lib functions that return `{ data, error }` to React Query's throw-on-error contract.
 *
 * Do not use when `null` data is a valid success (e.g. optional profile lookup).
 */
export function assertOk<T>(result: {
  data: T | null;
  error: string | null;
}): T {
  if (result.error) throw new Error(result.error);
  if (result.data == null) throw new Error('Not found');
  return result.data;
}
