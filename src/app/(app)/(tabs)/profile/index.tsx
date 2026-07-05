import { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Host, Text } from '@expo/ui';
import { Empty } from '@/components/empty';
import { PostFeedGrid, type PostGridItem } from '@/components/post-feed-grid';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { profileDisplayName } from '@/lib/profile-display';
import {
  useProfileFeedQuery,
  type ProfileFeedPostWithImage,
} from '@/queries/posts';
import { useUserProfileQuery } from '@/queries/profile';
import { useLocalPosts } from '@/hooks/useLocalPosts';
import { localPostToDetail } from '@/lib/local-post-adapter';
import type { LocalPost } from '@/lib/post-manager';
import type { PostDetailWithImage } from '@/queries/posts';

type ProfileGridItem = PostGridItem & {
  _sortKey: number;
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
  const { localPosts, refresh: refreshLocalPosts } = useLocalPosts(userId);
  const isFirstProfileFocus = useRef(true);

  // Re-fetch local posts and remote feed every time this tab gains focus (covers
  // NativeTabs remount/lazy-load scenarios where listeners may have fired while
  // the screen was inactive, e.g. pin toggled from Home or Friends).
  useFocusEffect(
    useCallback(() => {
      refreshLocalPosts();
      if (isFirstProfileFocus.current) {
        isFirstProfileFocus.current = false;
        return;
      }
      void feedQuery.refetch();
    }, [feedQuery.refetch, refreshLocalPosts]),
  );

  const displayName = profileDisplayName(profileQuery.data, email);

  // Build merged grid items sorted by date descending.
  const mergedPosts = useMemo((): ProfileGridItem[] => {
    const remoteIds = new Set((feedQuery.data ?? []).map((p) => p.id));

    const localItems: ProfileGridItem[] = localPosts
      .filter((lp) => !remoteIds.has(lp.remote_post_id ?? ''))
      .map((lp) => ({
        id: lp.id,
        imageUrl: lp.local_image_uri,
        isLocal: true,
        syncStatus: lp.status,
        _sortKey: lp.created_at,
        _localPost: lp,
      }));

    const remoteItems: ProfileGridItem[] = (feedQuery.data ?? []).map((rp) => ({
      ...rp,
      isPinned: rp.is_pinned_to_current_profile,
      _sortKey: new Date(rp.created_at).getTime(),
      _remotePost: rp,
    }));

    return [...localItems, ...remoteItems].sort((a, b) => b._sortKey - a._sortKey);
  }, [localPosts, feedQuery.data]);

  const showFeedLoading = feedQuery.isPending && localPosts.length === 0;
  const showFeedError = !!feedQuery.error && !feedQuery.isPending && mergedPosts.length === 0;
  const showFeedEmpty =
    !feedQuery.isPending && !feedQuery.error && mergedPosts.length === 0;

  const handleOpenPostDetail = useCallback(
    (post: ProfileGridItem) => {
      if (!userId) return;

      // Adapt the full merged feed so the pager can scroll through all posts,
      // both local and remote, regardless of which was tapped.
      const adaptedFeed: PostDetailWithImage[] = mergedPosts.map((item) =>
        item._localPost ? localPostToDetail(item._localPost) : item._remotePost!,
      );
      const localPostIdsList = localPosts.map((lp) => lp.id);

      router.push({
        pathname: '/(app)/post/[id]',
        params: {
          id: post.id,
          testIDPrefix: 'profile-post',
          localFeed: JSON.stringify(adaptedFeed),
          localPostIds: JSON.stringify(localPostIdsList),
        },
      });
    },
    [router, userId, mergedPosts, localPosts],
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
