import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { runSync } from '@/lib/sync-manager';

/**
 * Listens for network reconnection events and triggers the outbox sync loop.
 * Mount this once near the app root (inside PostManagerProvider).
 */
export function useNetworkSync(): void {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void runSync();
      }
    });
    return unsubscribe;
  }, []);
}
