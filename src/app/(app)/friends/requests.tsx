import { Children, useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { ActionButton } from '@/components/action-button';
import { ProfileListItem } from '@/components/profile-list-item';
import {
  cancelFriendRequest,
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  respondToFriendRequest,
  type FriendRequest,
} from '@/lib/friends';

export default function FriendRequestsScreen() {
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const loadRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const [incomingResult, outgoingResult] = await Promise.all([
      listIncomingFriendRequests(),
      listOutgoingFriendRequests(),
    ]);

    if (incomingResult.error || outgoingResult.error) {
      setError(incomingResult.error ?? outgoingResult.error);
    } else {
      setIncoming(incomingResult.data ?? []);
      setOutgoing(outgoingResult.data ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests]),
  );

  async function handleRespond(requestId: string, accept: boolean) {
    setBusyRequestId(requestId);
    setError(null);
    const { error: respondError } = await respondToFriendRequest(requestId, accept);
    setBusyRequestId(null);
    if (respondError) setError(respondError);
    else await loadRequests(true);
  }

  async function handleCancel(requestId: string) {
    setBusyRequestId(requestId);
    setError(null);
    const { error: cancelError } = await cancelFriendRequest(requestId);
    setBusyRequestId(null);
    if (cancelError) setError(cancelError);
    else await loadRequests(true);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Friend requests' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadRequests(true)} />
        }
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : (
          <View style={{ paddingBottom: 24 }}>
            {error ? (
              <Text
                testID="friend-requests-error"
                style={{ padding: 16, color: '#DC2626', fontSize: 14 }}
              >
                {error}
              </Text>
            ) : null}

            <Section title="Incoming" emptyMessage="No incoming requests." testID="incoming-requests">
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
                        disabled={busyRequestId !== null && busyRequestId !== request.request_id}
                        onPress={() => handleRespond(request.request_id, true)}
                      />
                      <ActionButton
                        testID={`decline-request-${request.username}`}
                        label="Decline"
                        variant="secondary"
                        loading={busyRequestId === request.request_id}
                        disabled={busyRequestId !== null && busyRequestId !== request.request_id}
                        onPress={() => handleRespond(request.request_id, false)}
                      />
                    </View>
                  }
                />
              ))}
            </Section>

            <Section title="Outgoing" emptyMessage="No outgoing requests." testID="outgoing-requests">
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
                      disabled={busyRequestId !== null && busyRequestId !== request.request_id}
                      onPress={() => handleCancel(request.request_id)}
                    />
                  }
                />
              ))}
            </Section>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function Section({
  title,
  emptyMessage,
  testID,
  children,
}: {
  title: string;
  emptyMessage: string;
  testID: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const isEmpty = items.length === 0;

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
      {isEmpty ? (
        <Text style={{ paddingHorizontal: 16, paddingVertical: 8, color: '#9CA3AF', fontSize: 14 }}>
          {emptyMessage}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
