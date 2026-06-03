import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { ActionButton } from '@/components/action-button';
import { ProfileListItem } from '@/components/profile-list-item';
import {
  cancelFriendRequest,
  listFriends,
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  respondToFriendRequest,
  type Friend,
  type FriendRequest,
} from '@/lib/friends';

function formatFriendsSince(iso: string) {
  try {
    return `Friends since ${new Date(iso).toLocaleDateString()}`;
  } catch {
    return undefined;
  }
}

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const [friendsResult, incomingResult, outgoingResult] = await Promise.all([
      listFriends(),
      listIncomingFriendRequests(),
      listOutgoingFriendRequests(),
    ]);

    if (friendsResult.error || incomingResult.error || outgoingResult.error) {
      setError(friendsResult.error ?? incomingResult.error ?? outgoingResult.error);
    } else {
      setFriends(friendsResult.data ?? []);
      setIncoming(incomingResult.data ?? []);
      setOutgoing(outgoingResult.data ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function handleRespond(requestId: string, accept: boolean) {
    setBusyRequestId(requestId);
    setError(null);
    const { error: respondError } = await respondToFriendRequest(requestId, accept);
    setBusyRequestId(null);
    if (respondError) setError(respondError);
    else await loadData(true);
  }

  async function handleCancel(requestId: string) {
    setBusyRequestId(requestId);
    setError(null);
    const { error: cancelError } = await cancelFriendRequest(requestId);
    setBusyRequestId(null);
    if (cancelError) setError(cancelError);
    else await loadData(true);
  }

  const hasRequests = incoming.length > 0 || outgoing.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Friends',
          headerRight: () => (
            <Pressable
              testID="friends-add-friend-header"
              onPress={() => router.push('/(app)/friends/search')}
              hitSlop={8}
            >
              <Text style={{ color: '#2563EB', fontSize: 16 }}>Add Friend</Text>
            </Pressable>
          ),
        }}
      />
      <View testID="friends-list" style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={{ padding: 24, gap: 12 }}>
            <Text testID="friends-error" selectable style={{ color: '#DC2626', fontSize: 14 }}>
              {error}
            </Text>
            <Pressable onPress={() => loadData()}>
              <Text style={{ color: '#2563EB', fontWeight: '600' }}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
            }
            ListHeaderComponent={
              hasRequests ? (
                <View>
                  {incoming.length > 0 ? (
                    <Section title="Incoming" testID="friends-requests-incoming">
                      {incoming.map((request) => (
                        <ProfileListItem
                          key={request.request_id}
                          testID={`incoming-request-${request.username}`}
                          displayName={request.display_name}
                          username={request.username}
                          trailing={
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <ActionButton
                                testID={`accept-request-${request.username}`}
                                label="Accept"
                                loading={busyRequestId === request.request_id}
                                disabled={
                                  busyRequestId !== null && busyRequestId !== request.request_id
                                }
                                onPress={() => handleRespond(request.request_id, true)}
                              />
                              <ActionButton
                                testID={`decline-request-${request.username}`}
                                label="Decline"
                                variant="secondary"
                                loading={busyRequestId === request.request_id}
                                disabled={
                                  busyRequestId !== null && busyRequestId !== request.request_id
                                }
                                onPress={() => handleRespond(request.request_id, false)}
                              />
                            </View>
                          }
                        />
                      ))}
                    </Section>
                  ) : null}
                  {outgoing.length > 0 ? (
                    <Section title="Outgoing" testID="friends-requests-outgoing">
                      {outgoing.map((request) => (
                        <ProfileListItem
                          key={request.request_id}
                          testID={`outgoing-request-${request.username}`}
                          displayName={request.display_name}
                          username={request.username}
                          trailing={
                            <ActionButton
                              testID={`cancel-request-${request.username}`}
                              label="Cancel"
                              variant="danger"
                              loading={busyRequestId === request.request_id}
                              disabled={
                                busyRequestId !== null && busyRequestId !== request.request_id
                              }
                              onPress={() => handleCancel(request.request_id)}
                            />
                          }
                        />
                      ))}
                    </Section>
                  ) : null}
                  {friends.length > 0 ? <Section title="Friends" testID="friends-section" /> : null}
                </View>
              ) : null
            }
            ListEmptyComponent={
              !hasRequests ? (
                <Text
                  testID="friends-empty"
                  style={{ padding: 24, fontSize: 15, color: '#6B7280', textAlign: 'center' }}
                >
                  No friends yet. Search for people to send a request.
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <ProfileListItem
                testID={`friend-row-${item.username}`}
                displayName={item.display_name}
                username={item.username}
                subtitle={formatFriendsSince(item.friends_since)}
              />
            )}
          />
        )}
      </View>
    </>
  );
}

function Section({
  title,
  testID,
  children,
}: {
  title: string;
  testID: string;
  children?: ReactNode;
}) {
  return (
    <View testID={testID}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
