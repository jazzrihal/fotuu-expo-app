import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Host, Text } from '@expo/ui';
import { Empty } from '@/components/empty';
import { PostFeedPager } from '@/components/post-feed-pager';
import { queryKeys } from '@/queries/keys';
import { useFriendsPostsQuery } from '@/queries/posts';
import { useRefreshOnFocus } from '@/queries/useRefreshOnFocus';

export function FriendsFeedTab() {
  const feedQuery = useFriendsPostsQuery();

  useRefreshOnFocus(queryKeys.friendsPosts());

  const posts = feedQuery.data ?? [];
  const showLoading = feedQuery.isPending;
  const showError = !!feedQuery.error && !showLoading;
  const showEmpty = !showLoading && !feedQuery.error && posts.length === 0;

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
      <PostFeedPager
        posts={posts}
        testIDPrefix="friends-post"
        testID="friends-feed-pager"
        includeTabBarInset
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
