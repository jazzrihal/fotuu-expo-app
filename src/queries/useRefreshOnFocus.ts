import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

export function useRefreshOnFocus(...prefixes: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient();
  const firstTimeRef = useRef(true);
  const prefixesRef = useRef(prefixes);

  useEffect(() => {
    prefixesRef.current = prefixes;
  }, [prefixes]);

  useFocusEffect(
    useCallback(() => {
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }
      for (const prefix of prefixesRef.current) {
        queryClient.refetchQueries({ queryKey: prefix, stale: true, type: 'active' });
      }
    }, [queryClient]),
  );
}
