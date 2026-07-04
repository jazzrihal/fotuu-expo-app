import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getLocalPosts, type LocalPost } from '@/lib/post-manager';
import { addSyncListener } from '@/lib/sync-manager';

/**
 * Stores posts keyed by userId so state can be derived without synchronous
 * setState calls inside effects (avoids react-hooks/set-state-in-effect).
 */
type PostsState = { userId: string; posts: LocalPost[] } | null;

export function useLocalPosts(userId: string | undefined): {
  localPosts: LocalPost[];
  refresh: () => void;
} {
  const [state, setState] = useState<PostsState>(null);

  // Derived: only expose posts when they belong to the current user
  const localPosts = state !== null && state.userId === userId ? state.posts : [];

  const fetchPosts = useCallback(() => {
    if (!userId) return;
    getLocalPosts(userId)
      .then((posts) => setState({ userId, posts }))
      .catch(() => {/* ignore */});
  }, [userId]);

  // Load on mount / userId change
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getLocalPosts(userId)
      .then((posts) => { if (!cancelled) setState({ userId, posts }); })
      .catch(() => {/* ignore */});
    return () => { cancelled = true; };
  }, [userId]);

  // Re-fetch after each sync run (status changes)
  useEffect(() => {
    return addSyncListener(fetchPosts);
  }, [fetchPosts]);

  // Re-fetch when app becomes active
  useEffect(() => {
    function handleAppState(nextState: AppStateStatus) {
      if (nextState === 'active') fetchPosts();
    }
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [fetchPosts]);

  return { localPosts, refresh: fetchPosts };
}
