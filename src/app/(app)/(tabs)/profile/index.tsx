import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Host, Text } from '@expo/ui';
import { Empty } from '@/components/empty';
import { PostFeedGrid, type PostGridItem } from '@/components/post-feed-grid';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { profileDisplayName } from '@/lib/profile-display';
import { openPostDetail } from '@/lib/navigation';
import {
  useProfileFeedQuery,
  type ProfileFeedPostWithImage,
} from '@/queries/posts';
import { useUserProfileQuery } from '@/queries/profile';
import { useLocalPosts } from '@/hooks/useLocalPosts';
import type { LocalPost } from '@/lib/post-manager';

type ProfileGridItem = PostGridItem & {
  _localPost?: LocalPost;
  _remotePost?: ProfileFeedPostWithImage;
};

export default function Profile() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session?.user.id;
  const email = session?.user.email;

  const profileQuery = useUserProfileQuery(userId);
  const feedQuery = useProfileFeedQuery(userId);
  const { localPosts } = useLocalPosts(userId);

  const displayName = profileDisplayName(profileQuery.data, email);

  // Build merged grid items: local-only posts first (sorted newest first), then remote
  const mergedPosts = useMemo((): ProfileGridItem[] => {
    const remoteIds = new Set((feedQuery.data ?? []).map((p) => p.id));

    const localItems: ProfileGridItem[] = localPosts
      .filter((lp) => !remoteIds.has(lp.remote_post_id ?? ''))
      .map((lp) => ({
        id: lp.id,
        imageUrl: lp.local_image_uri,
        isLocal: true,
        syncStatus: lp.status,
        _localPost: lp,
      }));

    const remoteItems: ProfileGridItem[] = (feedQuery.data ?? []).map((rp) => ({
      ...rp,
      _remotePost: rp,
    }));

    return [...localItems, ...remoteItems];
  }, [localPosts, feedQuery.data]);

  const showFeedLoading = feedQuery.isPending && localPosts.length === 0;
  const showFeedError = !!feedQuery.error && !feedQuery.isPending && mergedPosts.length === 0;
  const showFeedEmpty =
    !feedQuery.isPending && !feedQuery.error && mergedPosts.length === 0;

  const handleOpenPostDetail = useCallback(
    (post: ProfileGridItem) => {
      if (!userId) return;
      if (post._remotePost) {
        openPostDetail(router, post._remotePost, {
          testIDPrefix: 'profile-post',
          feedSource: { type: 'profile', userId },
        });
      }
      // Local-only posts open their own detail screen (not yet implemented)
    },
    [router, userId],
  );

  const feedContent = (() => {
    if (showFeedLoading) {
      return (
        <ScrollView
          style={styles.feed}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
        >
          <ActivityIndicator
            testID="profile-feed-loading"
            style={styles.loader}
          />
        </ScrollView>
      );
    }

    if (showFeedError) {
      return (
        <ScrollView
          style={styles.feed}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
        >
          <Host matchContents style={styles.feedMessage}>
            <Text testID="profile-feed-error">
              {feedQuery.error?.message ?? 'Failed to load posts'}
            </Text>
          </Host>
        </ScrollView>
      );
    }

    if (showFeedEmpty) {
      return (
        <ScrollView
          style={styles.feed}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
        >
          <Empty testID="profile-feed-empty" title="No posts yet" />
        </ScrollView>
      );
    }

    return (
      <PostFeedGrid
        testID="profile-post-grid"
        testIDPrefix="profile-feed"
        posts={mergedPosts}
        onPostPress={handleOpenPostDetail}
        contentInsetAdjustmentBehavior="automatic"
        refreshing={feedQuery.isRefetching && !feedQuery.isPending}
        onRefresh={() => {
          void feedQuery.refetch();
        }}
      />
    );
  })();

  return (
    <>
      <Stack.Screen options={{ title: displayName || 'Profile' }} />
      <View testID="profile-feed" style={styles.feed}>
        {feedContent}
      </View>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button accessibilityLabel="Sign out" onPress={signOut}>
          Sign out
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  feed: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  feedMessage: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  loader: {
    marginTop: 32,
  },
});
