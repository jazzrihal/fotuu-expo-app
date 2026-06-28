export const queryKeys = {
  feed: (params: { at: string; latitude: number; longitude: number }) =>
    ['feed', params] as const,
  post: (postId: string) => ['post', postId] as const,
  friends: () => ['friends'] as const,
  friendRequests: {
    incoming: () => ['friend-requests', 'incoming'] as const,
    outgoing: () => ['friend-requests', 'outgoing'] as const,
  },
  profileSearch: (query: string) => ['profile-search', query] as const,
  userProfile: (userId: string) => ['user-profile', userId] as const,
};
