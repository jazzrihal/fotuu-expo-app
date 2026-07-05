import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createPost,
  getPost,
  getPostImageUrls,
  getPostViewerEngagement,
  likePost,
  listFeedPosts,
  listFriendsPosts,
  listProfileFeedPosts,
  pinPost,
  unlikePost,
  unpinPost,
  uploadPostImage,
  type CreatePostInput,
  type FeedPost,
  type FriendsPost,
  type PostDetail,
  type ProfileFeedPost,
} from '@/lib/posts';
import type { PostFeedSource } from '@/lib/navigation';
import { assertOk } from '@/lib/result';
import { queryKeys } from '@/queries/keys';

export type FeedPostWithImage = FeedPost & { imageUrl?: string };
export type ProfileFeedPostWithImage = ProfileFeedPost & { imageUrl?: string };
export type FriendsPostWithImage = FriendsPost & { imageUrl?: string };
export type PostDetailWithImage =
  (FeedPost | PostDetail | ProfileFeedPost | FriendsPost) & { imageUrl?: string };

type FeedParams = {
  at: string;
  latitude: number;
  longitude: number;
};

function hasLocation(params: FeedParams): boolean {
  return (
    params.latitude != null &&
    params.longitude != null &&
    Number.isFinite(params.latitude) &&
    Number.isFinite(params.longitude)
  );
}

async function fetchFeedWithImages(params: FeedParams): Promise<FeedPostWithImage[]> {
  const posts = assertOk(await listFeedPosts(params));
  const urls = assertOk(await getPostImageUrls(posts.map((p) => p.storage_object_path)));
  return posts.map((post) => ({
    ...post,
    imageUrl: urls[post.storage_object_path],
  }));
}

async function fetchProfileFeedWithImages(
  userId: string,
): Promise<ProfileFeedPostWithImage[]> {
  const posts = assertOk(
    await listProfileFeedPosts({ profileUserId: userId }),
  );
  const urls = assertOk(
    await getPostImageUrls(posts.map((p) => p.storage_object_path)),
  );
  return posts.map((post) => ({
    ...post,
    imageUrl: urls[post.storage_object_path],
  }));
}

async function fetchFriendsPostsWithImages(): Promise<FriendsPostWithImage[]> {
  const posts = assertOk(await listFriendsPosts());
  const urls = assertOk(
    await getPostImageUrls(posts.map((p) => p.storage_object_path)),
  );
  return posts.map((post) => ({
    ...post,
    imageUrl: urls[post.storage_object_path],
  }));
}

async function fetchPostWithImage(postId: string): Promise<PostDetailWithImage> {
  const post = assertOk(await getPost(postId));
  const urls = assertOk(await getPostImageUrls([post.storage_object_path]));
  return {
    ...post,
    imageUrl: urls[post.storage_object_path],
  };
}

export function useFeedQuery(
  params: FeedParams,
  options?: { enabled?: boolean },
) {
  const locationEnabled = hasLocation(params);
  const enabled = (options?.enabled ?? true) && locationEnabled;
  return useQuery({
    queryKey: queryKeys.feed(params),
    queryFn: () => fetchFeedWithImages(params),
    enabled,
  });
}

export function useProfileFeedQuery(
  userId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.profileFeed(userId ?? ''),
    queryFn: () => fetchProfileFeedWithImages(userId!),
    enabled: (options?.enabled ?? true) && !!userId,
  });
}

export function useFriendsPostsQuery() {
  return useQuery({
    queryKey: queryKeys.friendsPosts(),
    queryFn: fetchFriendsPostsWithImages,
  });
}

export function usePostQuery(
  postId: string | null,
  options?: Pick<UseQueryOptions<PostDetailWithImage>, 'placeholderData' | 'enabled'>,
) {
  return useQuery({
    queryKey: queryKeys.post(postId ?? ''),
    queryFn: () => fetchPostWithImage(postId!),
    enabled: (options?.enabled ?? true) && !!postId,
    placeholderData: options?.placeholderData,
  });
}

export function usePostFeedPosts(feedSource: PostFeedSource | null) {
  const homeEnabled = feedSource?.type === 'home';
  const profileEnabled =
    feedSource?.type === 'profile' || feedSource?.type === 'user';
  const profileUserId =
    feedSource?.type === 'profile' || feedSource?.type === 'user'
      ? feedSource.userId
      : undefined;

  const homeQuery = useFeedQuery(
    {
      at: feedSource?.type === 'home' ? feedSource.at : '',
      latitude: feedSource?.type === 'home' ? feedSource.latitude : NaN,
      longitude: feedSource?.type === 'home' ? feedSource.longitude : NaN,
    },
    { enabled: homeEnabled },
  );

  const profileQuery = useProfileFeedQuery(profileUserId, {
    enabled: profileEnabled,
  });

  if (homeEnabled) {
    return {
      posts: homeQuery.data ?? [],
      isPending: homeQuery.isPending,
      error: homeQuery.error,
      refetch: homeQuery.refetch,
      isRefetching: homeQuery.isRefetching,
    };
  }

  if (profileEnabled) {
    return {
      posts: profileQuery.data ?? [],
      isPending: profileQuery.isPending,
      error: profileQuery.error,
      refetch: profileQuery.refetch,
      isRefetching: profileQuery.isRefetching,
    };
  }

  return null;
}

function patchPostListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: Partial<
    Pick<FeedPost, 'user_reaction' | 'is_pinned_by_current_user'> &
      Pick<ProfileFeedPost, 'is_pinned_to_current_profile'>
  >,
) {
  const updater = (old: { id: string }[] | undefined) =>
    old?.map((post) => (post.id === postId ? { ...post, ...patch } : post));

  queryClient.setQueriesData({ queryKey: ['feed'] }, updater);
  queryClient.setQueriesData({ queryKey: ['profile-feed'] }, updater);
  queryClient.setQueriesData({ queryKey: queryKeys.friendsPosts() }, updater);
}

export function useToggleLikeMutation(postId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nextLiked: boolean) => {
      if (!postId) throw new Error('Missing post');
      const result = nextLiked ? await likePost(postId) : await unlikePost(postId);
      if (result.error) throw new Error(result.error);
    },
    onMutate: async (nextLiked) => {
      if (!postId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.post(postId) });

      const previousPost = queryClient.getQueryData<PostDetailWithImage>(
        queryKeys.post(postId),
      );

      queryClient.setQueryData<PostDetailWithImage>(queryKeys.post(postId), (old) => {
        if (!old) return old;
        return {
          ...old,
          user_reaction: (nextLiked ? 'like' : null) as unknown as PostDetail['user_reaction'],
        };
      });

      patchPostListCaches(queryClient, postId, {
        user_reaction: (nextLiked ? 'like' : null) as unknown as FeedPost['user_reaction'],
      });

      return { previousPost };
    },
    onError: (_error, _nextLiked, context) => {
      if (!postId || !context?.previousPost) return;
      queryClient.setQueryData(queryKeys.post(postId), context.previousPost);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile-feed'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsPosts() });
    },
    onSettled: () => {
      if (!postId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
    },
  });
}

export function useTogglePinMutation(postId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nextPinned: boolean) => {
      if (!postId) throw new Error('Missing post');
      const result = nextPinned ? await pinPost(postId) : await unpinPost(postId);
      if (result.error) throw new Error(result.error);
    },
    onMutate: async (nextPinned) => {
      if (!postId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.post(postId) });

      const previousPost = queryClient.getQueryData<PostDetailWithImage>(
        queryKeys.post(postId),
      );

      queryClient.setQueryData<PostDetailWithImage>(queryKeys.post(postId), (old) =>
        old
          ? {
              ...old,
              is_pinned_by_current_user: nextPinned,
            }
          : old,
      );

      patchPostListCaches(queryClient, postId, {
        is_pinned_by_current_user: nextPinned,
        is_pinned_to_current_profile: nextPinned,
      });

      return { previousPost };
    },
    onError: (_error, _nextPinned, context) => {
      if (!postId || !context?.previousPost) return;
      queryClient.setQueryData(queryKeys.post(postId), context.previousPost);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile-feed'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsPosts() });
    },
    onSettled: () => {
      if (!postId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
    },
  });
}

export type CreatePostMutationInput = Omit<CreatePostInput, 'storagePath'> & {
  localImageUri: string;
  userId: string;
};

export function useCreatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostMutationInput) => {
      const { localImageUri, userId, ...createInput } = input;
      const { path, error: uploadError } = await uploadPostImage(localImageUri, userId);
      if (uploadError || !path) throw new Error(uploadError ?? 'Failed to upload image');

      const result = await createPost({ ...createInput, storagePath: path });
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile-feed'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsPosts() });
    },
  });
}

export { getPostViewerEngagement };
