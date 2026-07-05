/**
 * Hook tests for useLocalPosts using @testing-library/react-native renderHook.
 * RNTL v14 renderHook is async and must be awaited. All act() calls must be awaited.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('@/lib/post-manager', () => ({
  getLocalPosts: jest.fn(),
}));

jest.mock('@/lib/sync-manager', () => {
  // Use module-level listeners so we can trigger them from tests
  const listeners = new Set<() => void>();
  return {
    addSyncListener: jest.fn((fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }),
    __listeners: listeners,
  };
});

import { getLocalPosts } from '@/lib/post-manager';
import * as SyncManager from '@/lib/sync-manager';
import { useLocalPosts } from '../useLocalPosts';

const mockGetLocalPosts = getLocalPosts as jest.Mock;
const syncListeners = (SyncManager as unknown as { __listeners: Set<() => void> }).__listeners;

function triggerSyncListeners() {
  syncListeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const POSTS_A = [
  { id: 'p1', user_id: 'user-a', status: 'local' },
  { id: 'p2', user_id: 'user-a', status: 'queued' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLocalPosts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    syncListeners.clear();
    mockGetLocalPosts.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  it('returns empty array when userId is undefined', async () => {
    const { result } = await renderHook(() => useLocalPosts(undefined));
    expect(result.current.localPosts).toEqual([]);
    expect(mockGetLocalPosts).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('loads posts for the given userId on mount', async () => {
    mockGetLocalPosts.mockResolvedValue(POSTS_A);

    const { result } = await renderHook(() => useLocalPosts('user-a'));

    await waitFor(() => {
      expect(result.current.localPosts).toEqual(POSTS_A);
    });

    expect(mockGetLocalPosts).toHaveBeenCalledWith('user-a');
  });

  // -------------------------------------------------------------------------
  it('re-fetches posts when a sync listener fires', async () => {
    mockGetLocalPosts.mockResolvedValue(POSTS_A);
    const { result } = await renderHook(() => useLocalPosts('user-a'));

    await waitFor(() => {
      expect(result.current.localPosts).toHaveLength(POSTS_A.length);
    });

    const UPDATED = [{ id: 'p1', user_id: 'user-a', status: 'synced' }];
    mockGetLocalPosts.mockResolvedValue(UPDATED);

    await act(async () => {
      triggerSyncListeners();
    });

    await waitFor(() => {
      expect(result.current.localPosts).toEqual(UPDATED);
    });
  });

  // -------------------------------------------------------------------------
  it('re-fetches when AppState transitions to active', async () => {
    // Capture the AppState change handler registered by the hook
    let capturedHandler: ((state: string) => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      capturedHandler = handler as (state: string) => void;
      return { remove: jest.fn() };
    });

    mockGetLocalPosts.mockResolvedValue(POSTS_A);
    const { result } = await renderHook(() => useLocalPosts('user-a'));

    await waitFor(() => {
      expect(result.current.localPosts).toHaveLength(POSTS_A.length);
    });

    expect(capturedHandler).not.toBeNull();

    const UPDATED = [{ id: 'p3', user_id: 'user-a', status: 'queued' }];
    mockGetLocalPosts.mockResolvedValue(UPDATED);

    await act(async () => {
      capturedHandler!('active');
    });

    await waitFor(() => {
      expect(result.current.localPosts).toEqual(UPDATED);
    });

    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  it('does not expose posts from a previous userId after userId changes', async () => {
    mockGetLocalPosts.mockResolvedValue(POSTS_A);

    const { result, rerender } = await renderHook(
      ({ userId }: { userId: string | undefined }) => useLocalPosts(userId),
      { initialProps: { userId: 'user-a' as string | undefined } },
    );

    await waitFor(() => {
      expect(result.current.localPosts).toEqual(POSTS_A);
    });

    // Switch to a different user whose posts haven't loaded yet
    let resolvePending!: (posts: typeof POSTS_A) => void;
    mockGetLocalPosts.mockImplementation(
      () => new Promise<typeof POSTS_A>((res) => { resolvePending = res; }),
    );

    await act(async () => {
      rerender({ userId: 'user-b' });
    });

    // localPosts should be empty while the new user's posts are loading
    expect(result.current.localPosts).toEqual([]);

    // Resolve the pending promise to avoid open handles
    resolvePending([]);
  });
});

export {};
