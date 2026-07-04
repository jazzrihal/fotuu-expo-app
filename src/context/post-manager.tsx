import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getDb } from '@/lib/post-db';
import { runSync } from '@/lib/sync-manager';
import { registerPostSyncTask } from '@/tasks/post-sync-task';
import { useNetworkSync } from '@/hooks/useNetworkSync';

type PostManagerContextValue = {
  triggerSync: () => void;
};

const PostManagerContext = createContext<PostManagerContextValue | null>(null);

export function PostManagerProvider({ children }: { children: ReactNode }) {
  const triggerSync = useCallback(() => {
    void runSync();
  }, []);

  // Initialise the SQLite DB and background task on mount
  useEffect(() => {
    void getDb();
    void registerPostSyncTask();
  }, []);

  // Trigger sync when app comes to foreground
  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') {
        triggerSync();
      }
    }
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [triggerSync]);

  // Network reconnect → sync
  useNetworkSync();

  return (
    <PostManagerContext.Provider value={{ triggerSync }}>
      {children}
    </PostManagerContext.Provider>
  );
}

export function usePostManager(): PostManagerContextValue {
  const ctx = useContext(PostManagerContext);
  if (!ctx) {
    throw new Error('usePostManager must be used within PostManagerProvider');
  }
  return ctx;
}
