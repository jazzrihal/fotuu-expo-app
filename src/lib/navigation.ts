import type { ImperativeRouter } from 'expo-router';

export type PostDetailTestIDPrefix =
  | 'home-post'
  | 'friends-post'
  | 'profile-post'
  | 'user-post';

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

export function openPostDetail(
  router: ImperativeRouter,
  post: { id: string },
  options: { testIDPrefix: PostDetailTestIDPrefix },
) {
  router.push({
    pathname: '/(app)/post/[id]',
    params: {
      id: post.id,
      post: JSON.stringify(post),
      testIDPrefix: options.testIDPrefix,
    },
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
