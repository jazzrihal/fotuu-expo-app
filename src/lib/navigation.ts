import type { ImperativeRouter } from 'expo-router';
import type { LocalPost } from '@/lib/post-db';

export type PostDetailTestIDPrefix =
  | 'home-post'
  | 'friends-post'
  | 'profile-post'
  | 'user-post';

export type PostFeedSource =
  | { type: 'home'; at: string; latitude: number; longitude: number }
  | { type: 'profile'; userId: string }
  | { type: 'user'; userId: string };

const POST_DETAIL_TEST_ID_PREFIXES: PostDetailTestIDPrefix[] = [
  'home-post',
  'friends-post',
  'profile-post',
  'user-post',
];

export function parsePostDetailTestIDPrefix(
  value: string | string[] | undefined,
): PostDetailTestIDPrefix | 'post' {
  if (typeof value !== 'string') {
    return 'post';
  }

  return POST_DETAIL_TEST_ID_PREFIXES.includes(value as PostDetailTestIDPrefix)
    ? (value as PostDetailTestIDPrefix)
    : 'post';
}

export function parsePostFeedSource(
  value: string | string[] | undefined,
): PostFeedSource | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as PostFeedSource;
    if (
      parsed.type === 'home' &&
      typeof parsed.at === 'string' &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number'
    ) {
      return parsed;
    }
    if (
      (parsed.type === 'profile' || parsed.type === 'user') &&
      typeof parsed.userId === 'string' &&
      parsed.userId.length > 0
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function openPostDetail(
  router: ImperativeRouter,
  post: { id: string },
  options: { testIDPrefix: PostDetailTestIDPrefix; feedSource: PostFeedSource },
) {
  router.push({
    pathname: '/(app)/post/[id]',
    params: {
      id: post.id,
      post: JSON.stringify(post),
      testIDPrefix: options.testIDPrefix,
      feedSource: JSON.stringify(options.feedSource),
    },
  });
}

export function openLocalPostDetail(router: ImperativeRouter, post: LocalPost) {
  router.push({
    pathname: '/(app)/post/[id]',
    params: { id: post.id, localPost: JSON.stringify(post) },
  });
}

export function openUserProfile(
  router: ImperativeRouter,
  sessionUserId: string | undefined,
  profile: { id: string; displayName?: string; username?: string },
) {
  if (profile.id === sessionUserId) {
    router.push('/(app)/(tabs)/profile');
    return;
  }

  router.push({
    pathname: '/(app)/user/[id]',
    params: {
      id: profile.id,
      displayName: profile.displayName,
      username: profile.username,
    },
  });
}
