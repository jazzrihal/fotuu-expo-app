import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '@/lib/profile';
import { queryKeys } from '@/queries/keys';

export function useUserProfileQuery(
  userId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.userProfile(userId ?? ''),
    queryFn: async () => {
      const { data, error } = await getUserProfile(userId!);
      if (error) throw new Error(error);
      return data;
    },
    enabled: (options?.enabled ?? true) && !!userId,
  });
}
