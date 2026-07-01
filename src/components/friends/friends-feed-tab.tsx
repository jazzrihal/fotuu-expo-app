import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Host, Text } from '@expo/ui';
import { useRouter } from 'expo-router';
import { Empty } from '@/components/empty';
import { openPostDetail } from '@/lib/navigation';
import { PostFeedGrid } from '@/components/post-feed-grid';
import { queryKeys } from '@/queries/keys';
import {
  useFriendsPostsQuery,
  type FriendsPostWithImage,
} from '@/queries/posts';
import { useRefreshOnFocus } from '@/queries/useRefreshOnFocus';

export function FriendsFeedTab() {
  const router = useRouter();
  const feedQuery = useFriendsPostsQuery();

  useRefreshOnFocus(queryKeys.friendsPosts());

  const posts = feedQuery.data ?? [];
  const showLoading = feedQuery.isPending;
  const showError = !!feedQuery.error && !showLoading;
  const showEmpty = !showLoading && !feedQuery.error && posts.length === 0;

  const handleOpenPostDetail = useCallback(
    (post: FriendsPostWithImage) => {
      openPostDetail(router, post, { testIDPrefix: 'friends-post' });
    },
    [router],
  );

  if (showLoading) {
    return <ActivityIndicator style={styles.loader} testID="friends-feed-loading" />;
  }

  if (showError) {
    return (
      <Host matchContents style={styles.message}>
        <Text testID="friends-feed-error">
          {feedQuery.error?.message ?? 'Failed to load feed'}
        </Text>
      </Host>
    );
  }

  if (showEmpty) {
    return (
      <Empty
        testID="friends-feed-empty"
        title="No posts from friends"
        description="When friends share posts, they will appear here."
      />
    );
  }

  return (
    <View testID="friends-feed" style={styles.feed}>
      <PostFeedGrid
        testID="friends-feed-grid"
        testIDPrefix="friends-feed"
        posts={posts}
        onPostPress={handleOpenPostDetail}
        contentInsetAdjustmentBehavior="automatic"
        refreshing={feedQuery.isRefetching && !feedQuery.isPending}
        onRefresh={() => {
          void feedQuery.refetch();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    flex: 1,
  },
  loader: {
    marginTop: 32,
  },
  message: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
});
