import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelFriendRequest,
  getRelationshipStatus,
  listFriends,
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  removeFriend,
  respondToFriendRequest,
  searchProfiles,
  sendFriendRequest,
} from '@/lib/friends';
import { assertOk } from '@/lib/result';
import { queryKeys } from '@/queries/keys';

function invalidateFriendsQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.friends() });
  queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
  queryClient.invalidateQueries({ queryKey: ['profile-search'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.friendsPosts() });
}

export function useFriendsQuery() {
  return useQuery({
    queryKey: queryKeys.friends(),
    queryFn: async () => assertOk(await listFriends()),
  });
}

export function useIncomingRequestsQuery() {
  return useQuery({
    queryKey: queryKeys.friendRequests.incoming(),
    queryFn: async () => assertOk(await listIncomingFriendRequests()),
  });
}

export function useOutgoingRequestsQuery() {
  return useQuery({
    queryKey: queryKeys.friendRequests.outgoing(),
    queryFn: async () => assertOk(await listOutgoingFriendRequests()),
  });
}

export function useProfileSearchQuery(
  query: string,
  options?: { enabled?: boolean },
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.profileSearch(trimmed),
    queryFn: async () => assertOk(await searchProfiles(trimmed)),
    enabled: options?.enabled ?? trimmed.length >= 2,
  });
}

export function useRespondToFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, accept }: { requestId: string; accept: boolean }) =>
      respondToFriendRequest(requestId, accept).then((result) => {
        if (result.error) throw new Error(result.error);
      }),
    onSuccess: () => invalidateFriendsQueries(queryClient),
  });
}

export function useCancelFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      cancelFriendRequest(requestId).then((result) => {
        if (result.error) throw new Error(result.error);
      }),
    onSuccess: () => invalidateFriendsQueries(queryClient),
  });
}

export function useSendFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) =>
      sendFriendRequest(profileId).then((result) => {
        if (result.error) throw new Error(result.error);
      }),
    onSuccess: () => invalidateFriendsQueries(queryClient),
  });
}

export function useRemoveFriendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendId: string) =>
      removeFriend(friendId).then((result) => {
        if (result.error) throw new Error(result.error);
      }),
    onSuccess: () => invalidateFriendsQueries(queryClient),
  });
}

export function useRelationshipStatusQuery(
  otherUserId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['relationship-status', otherUserId ?? ''],
    queryFn: async () => {
      const { data, error } = await getRelationshipStatus(otherUserId!);
      if (error) throw new Error(error);
      return data ?? 'none';
    },
    enabled: (options?.enabled ?? true) && !!otherUserId,
  });
}
