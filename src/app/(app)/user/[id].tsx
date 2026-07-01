import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Host, Row, Text } from '@expo/ui';
import { Empty } from '@/components/empty';
import { PostFeedGrid } from '@/components/post-feed-grid';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { profileDisplayName } from '@/lib/profile-display';
import { openPostDetail } from '@/lib/navigation';
import {
  parseRelationshipStatus,
  type RelationshipKind,
} from '@/lib/relationship-status';
import {
  useCancelFriendRequestMutation,
  useIncomingRequestsQuery,
  useOutgoingRequestsQuery,
  useRelationshipStatusQuery,
  useRespondToFriendRequestMutation,
  useSendFriendRequestMutation,
} from '@/queries/friends';
import {
  useProfileFeedQuery,
  type ProfileFeedPostWithImage,
} from '@/queries/posts';
import { useUserProfileQuery } from '@/queries/profile';

export default function UserProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { id, displayName: paramDisplayName, username: paramUsername } =
    useLocalSearchParams<{
      id: string;
      displayName?: string;
      username?: string;
    }>();
  const userId = typeof id === 'string' ? id : undefined;
  const routeDisplayName =
    typeof paramDisplayName === 'string' && paramDisplayName.length > 0
      ? paramDisplayName
      : undefined;
  const routeUsername =
    typeof paramUsername === 'string' && paramUsername.length > 0
      ? paramUsername
      : undefined;
  const isSelf = !!userId && session?.user.id === userId;

  const profileQuery = useUserProfileQuery(userId, { enabled: !isSelf });
  const feedQuery = useProfileFeedQuery(userId, { enabled: !isSelf });
  const relationshipQuery = useRelationshipStatusQuery(userId, { enabled: !isSelf });
  const incomingQuery = useIncomingRequestsQuery();
  const outgoingQuery = useOutgoingRequestsQuery();

  const sendMutation = useSendFriendRequestMutation();
  const respondMutation = useRespondToFriendRequestMutation();
  const cancelMutation = useCancelFriendRequestMutation();

  const relationship = parseRelationshipStatus(relationshipQuery.data);
  const requestId = useMemo(() => {
    if (!userId) return null;
    const incoming = incomingQuery.data?.find((request) => request.id === userId);
    if (incoming) return incoming.request_id;
    const outgoing = outgoingQuery.data?.find((request) => request.id === userId);
    if (outgoing) return outgoing.request_id;
    return null;
  }, [incomingQuery.data, outgoingQuery.data, userId]);

  const displayName =
    profileDisplayName(profileQuery.data, undefined) || routeDisplayName || '';
  const username = profileQuery.data?.username ?? routeUsername;
  const headerTitle = displayName || username || 'Profile';
  const hasRouteProfileHint = !!routeDisplayName || !!routeUsername;

  const posts = feedQuery.data ?? [];
  const showFeedLoading = feedQuery.isPending;
  const showFeedError = !!feedQuery.error && !showFeedLoading;
  const showFeedEmpty =
    !showFeedLoading && !feedQuery.error && posts.length === 0;

  const handleOpenPostDetail = useCallback(
    (post: ProfileFeedPostWithImage) => {
      openPostDetail(router, post, { testIDPrefix: 'user-post' });
    },
    [router],
  );

  const actionPending =
    sendMutation.isPending ||
    respondMutation.isPending ||
    cancelMutation.isPending;

  const actionError =
    sendMutation.error?.message ??
    respondMutation.error?.message ??
    cancelMutation.error?.message ??
    null;

  const relationshipActions = userId
    ? renderRelationshipActions({
        relationship,
        requestId,
        userId,
        actionPending,
        onSend: () => sendMutation.mutate(userId),
        onAccept: () => {
          if (requestId) respondMutation.mutate({ requestId, accept: true });
        },
        onDecline: () => {
          if (requestId) respondMutation.mutate({ requestId, accept: false });
        },
        onCancel: () => {
          if (requestId) cancelMutation.mutate(requestId);
        },
      })
    : null;

  if (isSelf) {
    return <Redirect href="/(app)/(tabs)/profile" />;
  }

  const feedContent = (() => {
    if (showFeedLoading) {
      return (
        <ScrollView
          style={styles.feed}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
        >
          <ActivityIndicator
            testID="user-profile-feed-loading"
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
            <Text testID="user-profile-feed-error">
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
          <Empty testID="user-profile-feed-empty" title="No posts yet" />
        </ScrollView>
      );
    }

    return (
      <PostFeedGrid
        testID="user-profile-feed-grid"
        testIDPrefix="user-profile-feed"
        posts={posts}
        onPostPress={handleOpenPostDetail}
        contentInsetAdjustmentBehavior="automatic"
        refreshing={feedQuery.isRefetching && !feedQuery.isPending}
        onRefresh={() => {
          void feedQuery.refetch();
        }}
      />
    );
  })();

  if (profileQuery.isPending && !profileQuery.data && !hasRouteProfileHint) {
    return (
      <>
        <Stack.Screen options={{ title: headerTitle }} />
        <ActivityIndicator style={styles.loader} />
      </>
    );
  }

  if (profileQuery.error && !profileQuery.data && !hasRouteProfileHint) {
    return (
      <>
        <Stack.Screen options={{ title: headerTitle }} />
        <Empty
          testID="user-profile-not-found"
          title="Profile not found"
          description={profileQuery.error.message}
        />
      </>
    );
  }

  const hasHeaderContent = !!relationshipActions || !!actionError;

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <View testID="user-profile" style={styles.screen}>
        {hasHeaderContent ? (
          <View style={styles.header}>
            {relationshipActions ? (
              <View style={styles.actionRow}>
                <Host matchContents>{relationshipActions}</Host>
              </View>
            ) : null}
            {actionError ? (
              <Host matchContents>
                <Text testID="user-profile-action-error">{actionError}</Text>
              </Host>
            ) : null}
          </View>
        ) : null}
        <View style={styles.feed}>{feedContent}</View>
      </View>
    </>
  );
}

function renderRelationshipActions({
  relationship,
  requestId,
  userId,
  actionPending,
  onSend,
  onAccept,
  onDecline,
  onCancel,
}: {
  relationship: RelationshipKind;
  requestId: string | null;
  userId: string;
  actionPending: boolean;
  onSend: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  switch (relationship) {
    case 'friends':
      return null;
    case 'incoming_request':
      return (
        <Row spacing={8} alignment="center">
          <Button
            testID={`user-profile-accept-${userId}`}
            variant="filled"
            label={actionPending ? 'Accepting…' : 'Accept'}
            disabled={actionPending || !requestId}
            onPress={onAccept}
          />
          <Button
            testID={`user-profile-decline-${userId}`}
            variant="outlined"
            label={actionPending ? 'Declining…' : 'Decline'}
            disabled={actionPending || !requestId}
            onPress={onDecline}
          />
        </Row>
      );
    case 'outgoing_request':
      return (
        <Button
          testID={`user-profile-cancel-${userId}`}
          variant="outlined"
          label={actionPending ? 'Canceling…' : 'Cancel request'}
          disabled={actionPending || !requestId}
          onPress={onCancel}
        />
      );
    case 'none':
    case 'unknown':
      return (
        <Button
          testID={`user-profile-add-${userId}`}
          variant="filled"
          label={actionPending ? 'Adding…' : 'Add friend'}
          disabled={actionPending}
          onPress={onSend}
        />
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
