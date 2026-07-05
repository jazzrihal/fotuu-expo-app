import { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FieldGroup, Host, RNHostView, Text } from '@expo/ui';
import { useRouter } from 'expo-router';
import { Empty } from '@/components/empty';
import {
  FRIENDS_FEED_SECTION_FOOTER_INSET,
  FriendsFeedThumbnailRow,
  getFriendsFeedThumbnailRowHeight,
} from '@/components/friends/friends-feed-thumbnail-row';
import { useAuth } from '@/context/auth';
import { openUserProfile } from '@/lib/navigation';
import { flattenFriendsPostsGrouped } from '@/lib/posts';
import { queryKeys } from '@/queries/keys';
import {
  useFriendsPostsQuery,
  type FriendsPostWithImage,
} from '@/queries/posts';
import { useRefreshOnFocus } from '@/queries/useRefreshOnFocus';

export function FriendsFeedTab() {
  const router = useRouter();
  const { session } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const feedQuery = useFriendsPostsQuery();

  useRefreshOnFocus(queryKeys.friendsPosts());

  const groups = feedQuery.data?.groups ?? [];
  const flattenedPosts = useMemo(
    () => flattenFriendsPostsGrouped(groups),
    [groups],
  );

  const showLoading = feedQuery.isPending;
  const showError = !!feedQuery.error && !showLoading;
  const showEmpty = !showLoading && !feedQuery.error && flattenedPosts.length === 0;

  const handleOpenPostDetail = useCallback(
    (post: FriendsPostWithImage) => {
      router.push({
        pathname: '/(app)/post/[id]',
        params: {
          id: post.id,
          testIDPrefix: 'friends-post',
          localFeed: JSON.stringify(flattenedPosts),
        },
      });
    },
    [router, flattenedPosts],
  );

  const handleOpenProfile = useCallback(
    (profile: { id: string; displayName: string; username: string }) => {
      openUserProfile(router, session?.user.id, {
        id: profile.id,
        displayName: profile.displayName,
        username: profile.username,
      });
    },
    [router, session?.user.id],
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
    <Host testID="friends-feed" useViewportSizeMeasurement style={styles.feed}>
      <FieldGroup>
        {groups.map((group) => {
          const rowHeight = getFriendsFeedThumbnailRowHeight(
            group.posts.length,
            screenWidth,
          );

          return (
          <FieldGroup.Section
            key={group.author_id}
            testID={`friends-feed-section-${group.username}`}
          >
            <FieldGroup.SectionHeader>
              <Text
                testID={`friends-feed-section-${group.username}-name`}
                textStyle={{ fontWeight: '600' }}
                onPress={() =>
                  handleOpenProfile({
                    id: group.author_id,
                    displayName: group.display_name,
                    username: group.username,
                  })
                }
              >
                {group.display_name}
              </Text>
            </FieldGroup.SectionHeader>
            <FieldGroup.SectionFooter>
              <RNHostView matchContents>
                <View
                  style={[
                    styles.thumbnailSlot,
                    {
                      width: screenWidth,
                      height: rowHeight,
                      marginHorizontal: -FRIENDS_FEED_SECTION_FOOTER_INSET,
                    },
                  ]}
                >
                  <FriendsFeedThumbnailRow
                    posts={group.posts}
                    screenWidth={screenWidth}
                    testIDPrefix="friends-feed"
                    onPostPress={handleOpenPostDetail}
                  />
                </View>
              </RNHostView>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          );
        })}
      </FieldGroup>
    </Host>
  );
}

const styles = StyleSheet.create({
  feed: {
    flex: 1,
  },
  thumbnailSlot: {
    overflow: 'hidden',
  },
  loader: {
    marginTop: 32,
  },
  message: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
});
