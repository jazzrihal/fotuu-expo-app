import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { toPostgisPoint } from '@/lib/postgis';

export type FeedPost =
  Database['public']['Functions']['list_feed_posts']['Returns'][number];

export type ProfileFeedPost =
  Database['public']['Functions']['list_profile_feed_posts']['Returns'][number];

export type FriendsPost =
  Database['public']['Functions']['list_friends_posts']['Returns'][number];

export type FriendsGroupedPost = Omit<
  FriendsPost,
  'author_id' | 'display_name' | 'username'
>;

export type FriendsPostsGroup = {
  author_id: string;
  username: string;
  display_name: string;
  latest_captured_at: string;
  posts: FriendsGroupedPost[];
};

export type PostDetail =
  Database['public']['Functions']['get_post']['Returns'][number];

export type PostPrivacyScope = Database['public']['Enums']['post_privacy_scope'];

export const DEFAULT_POST_PRIVACY_SCOPE: PostPrivacyScope = 'friends_only';

export type PostViewerEngagementSource = Pick<
  FeedPost | PostDetail | ProfileFeedPost | FriendsPost,
  'user_reaction' | 'is_pinned_by_current_user'
>;

export function getPostViewerEngagement(post: PostViewerEngagementSource) {
  return {
    isLiked: post.user_reaction === 'like',
    isPinned: post.is_pinned_by_current_user,
  };
}

const POST_IMAGES_BUCKET = 'post-images';
const SIGNED_URL_TTL_SECONDS = 3600;

function rpcErrorMessage(error: { message: string } | null): string | null {
  return error?.message ?? null;
}

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function buildPostImagePath(userId: string, extension = 'jpg'): string {
  return `${userId}/${randomUuid()}.${extension}`;
}

export async function uploadPostImage(
  localUri: string,
  userId: string,
): Promise<{ path: string | null; error: string | null }> {
  const path = buildPostImagePath(userId);

  try {
    // fetch().blob() fails on React Native/Hermes for file:// URIs because internally
    // the response body is an ArrayBuffer and Hermes forbids new Blob([arrayBuffer]).
    // XHR with responseType='arraybuffer' reads the file directly without creating a Blob,
    // and Supabase storage accepts ArrayBuffer as a valid upload body.
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => resolve(xhr.response as ArrayBuffer);
      xhr.onerror = () => reject(new Error('Failed to read image file'));
      xhr.open('GET', localUri);
      xhr.send();
    });

    const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (error) {
      return { path: null, error: error.message };
    }

    return { path, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return { path: null, error: message };
  }
}

export type CreatePostInput = {
  storagePath: string;
  capturedAt: string;
  caption?: string | null;
  privacyScope: PostPrivacyScope;
  latitude?: number;
  longitude?: number;
};

export async function createPost(
  input: CreatePostInput,
): Promise<{ data: { id: string } | null; error: string | null }> {
  const insert: Database['public']['Tables']['posts']['Insert'] = {
    storage_object_path: input.storagePath,
    captured_at: input.capturedAt,
    caption: input.caption?.trim() || null,
    privacy_scope: input.privacyScope,
  };

  if (
    input.latitude !== undefined &&
    input.longitude !== undefined &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    insert.location = toPostgisPoint(input.longitude, input.latitude);
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(insert)
    .select('id')
    .single();

  return { data, error: rpcErrorMessage(error) };
}

export async function listProfileFeedPosts(params: {
  profileUserId: string;
  limit?: number;
}): Promise<{ data: ProfileFeedPost[] | null; error: string | null }> {
  const { data, error } = await supabase.rpc('list_profile_feed_posts', {
    p_profile_user_id: params.profileUserId,
    p_limit: params.limit ?? 30,
  });

  return { data, error: rpcErrorMessage(error) };
}

export async function listFeedPosts(params: {
  at: string;
  latitude: number;
  longitude: number;
  limit?: number;
  maxDistanceMeters?: number;
}): Promise<{ data: FeedPost[] | null; error: string | null }> {
  const { data, error } = await supabase.rpc('list_feed_posts', {
    p_at: params.at,
    p_latitude: params.latitude,
    p_longitude: params.longitude,
    p_limit: params.limit ?? 30,
    p_max_distance_meters: params.maxDistanceMeters,
  });

  return { data, error: rpcErrorMessage(error) };
}

function isFriendsGroupedPost(value: unknown): value is FriendsGroupedPost {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FriendsGroupedPost).id === 'string' &&
    typeof (value as FriendsGroupedPost).storage_object_path === 'string'
  );
}

function isFriendsPostsGroup(value: unknown): value is FriendsPostsGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FriendsPostsGroup).author_id === 'string' &&
    typeof (value as FriendsPostsGroup).username === 'string' &&
    typeof (value as FriendsPostsGroup).display_name === 'string' &&
    Array.isArray((value as FriendsPostsGroup).posts) &&
    (value as FriendsPostsGroup).posts.every(isFriendsGroupedPost)
  );
}

function parseFriendsPostsGroups(data: unknown): FriendsPostsGroup[] | null {
  if (!Array.isArray(data)) {
    return null;
  }

  if (!data.every(isFriendsPostsGroup)) {
    return null;
  }

  return data;
}

export function enrichGroupedPost(
  group: Pick<FriendsPostsGroup, 'author_id' | 'display_name' | 'username'>,
  post: FriendsGroupedPost,
  imageUrl?: string,
): FriendsPost & { imageUrl?: string } {
  return {
    ...post,
    author_id: group.author_id,
    display_name: group.display_name,
    username: group.username,
    imageUrl,
  };
}

export function flattenFriendsPostsGrouped(
  groups: Array<FriendsPostsGroup & { posts: Array<FriendsPost & { imageUrl?: string }> }>,
): Array<FriendsPost & { imageUrl?: string }> {
  return groups.flatMap((group) => group.posts);
}

export async function listFriendsPostsGrouped(params?: {
  recentWithin?: string;
}): Promise<{ data: FriendsPostsGroup[] | null; error: string | null }> {
  const { data, error } = await supabase.rpc('list_friends_posts_grouped', {
    p_recent_within: params?.recentWithin ?? '7 days',
  });

  if (error) {
    return { data: null, error: rpcErrorMessage(error) };
  }

  const groups = parseFriendsPostsGroups(data);
  if (!groups) {
    return { data: null, error: 'Invalid friends feed response' };
  }

  return { data: groups, error: null };
}

export async function getPostImageUrls(
  paths: string[],
): Promise<{ data: Record<string, string>; error: string | null }> {
  if (paths.length === 0) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) {
    return { data: {}, error: error.message };
  }

  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      urls[item.path] = item.signedUrl;
    }
  }

  return { data: urls, error: null };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export async function getPost(
  postId: string,
): Promise<{ data: PostDetail | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_post', { p_post_id: postId });

  return { data: data?.[0] ?? null, error: rpcErrorMessage(error) };
}

export async function likePost(
  postId: string,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: 'Not signed in' };
  }

  const { error } = await supabase.from('post_reactions').upsert(
    {
      post_id: postId,
      user_id: userId,
      reaction_type: 'like',
    },
    { onConflict: 'user_id,post_id' },
  );

  return { error: rpcErrorMessage(error) };
}

export async function unlikePost(
  postId: string,
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: 'Not signed in' };
  }

  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  return { error: rpcErrorMessage(error) };
}

export async function pinPost(
  postId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('pin_post', { p_post_id: postId });

  return { error: rpcErrorMessage(error) };
}

export async function unpinPost(
  postId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('unpin_post', { p_post_id: postId });

  return { error: rpcErrorMessage(error) };
}
