import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMoment,
  deleteMoment,
  listMoments,
  type CreateMomentInput,
} from '@/lib/moments';
import { assertOk } from '@/lib/result';
import { queryKeys } from '@/queries/keys';

export function useMomentsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.moments(),
    queryFn: async () => assertOk(await listMoments({ limit: 30 })),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateMomentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMomentInput) =>
      assertOk(await createMoment(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.moments() });
    },
  });
}

export function useDeleteMomentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (momentId: string) => {
      const { error } = await deleteMoment(momentId);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.moments() });
    },
  });
}
