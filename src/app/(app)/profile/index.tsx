import { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Host, Text } from '@expo/ui';
import { Empty } from '@/components/empty';
import { PostFeedGrid } from '@/components/post-feed-grid';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { profileDisplayName } from '@/lib/profile-display';
import {
  useProfileFeedQuery,
  type ProfileFeedPostWithImage,
} from '@/queries/posts';
import { useUserProfileQuery } from '@/queries/profile';

export default function Profile() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session?.user.id;
  const email = session?.user.email;

  const profileQuery = useUserProfileQuery(userId);
  const feedQuery = useProfileFeedQuery(userId);

  const displayName = profileDisplayName(profileQuery.data, email);

  const posts = feedQuery.data ?? [];
  const showFeedLoading = feedQuery.isPending;
  const showFeedError = !!feedQuery.error && !showFeedLoading;
  const showFeedEmpty =
    !showFeedLoading && !feedQuery.error && posts.length === 0;

  const openPostDetail = useCallback(
    (post: ProfileFeedPostWithImage) => {
      router.push({
        pathname: '/(app)/profile/[id]',
        params: {
          id: post.id,
          post: JSON.stringify(post),
        },
      });
    },
    [router],
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
        testID="profile-feed-grid"
        testIDPrefix="profile-feed"
        posts={posts}
        onPostPress={openPostDetail}
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
