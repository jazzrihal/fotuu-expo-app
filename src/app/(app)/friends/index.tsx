import { useCallback, useState } from "react";
import { ActivityIndicator, Text as RNText } from "react-native";
import { Button, Column, FieldGroup, Host, Row, Text } from "@expo/ui";
import { router, Stack, useFocusEffect } from "expo-router";
import { ProfileListItem } from "@/components/profile-list-item";
import {
  cancelFriendRequest,
  listFriends,
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  respondToFriendRequest,
  type Friend,
  type FriendRequest,
} from "@/lib/friends";

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
  const [error, setError] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    const [friendsResult, incomingResult, outgoingResult] = await Promise.all([
      listFriends(),
      listIncomingFriendRequests(),
      listOutgoingFriendRequests(),
    ]);

    if (friendsResult.error || incomingResult.error || outgoingResult.error) {
      setError(
        friendsResult.error ?? incomingResult.error ?? outgoingResult.error,
      );
    } else {
      setFriends(friendsResult.data ?? []);
      setIncoming(incomingResult.data ?? []);
      setOutgoing(outgoingResult.data ?? []);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function handleRespond(requestId: string, accept: boolean) {
    setBusyRequestId(requestId);
    setError(null);
    const { error: respondError } = await respondToFriendRequest(
      requestId,
      accept,
    );
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
      <Stack.Screen options={{ title: "Friends" }} />
      <Host
        testID="friends-list"
        style={{ flex: 1 }}
        useViewportSizeMeasurement
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Column spacing={12} style={{ padding: 24 }}>
            <RNText testID="friends-error" selectable>
              {error}
            </RNText>
            <Button
              variant="text"
              label="Try again"
              onPress={() => loadData()}
            />
          </Column>
        ) : (
          <>
            {!hasRequests && friends.length === 0 ? (
              <Text testID="friends-empty" style={{ padding: 24 }}>
                No friends yet. Search for people to send a request.
              </Text>
            ) : null}
            <FieldGroup>
              {hasRequests ? (
                <FieldGroup.Section title="Pending" testID="friends-requests-pending">
                  {incoming.map((request) => (
                    <ProfileListItem
                      key={request.request_id}
                      testID={`incoming-request-${request.username}`}
                      displayName={request.display_name}
                      username={request.username}
                      trailing={
                        <Row spacing={8} alignment="center">
                          <Button
                            testID={`accept-request-${request.username}`}
                            variant="filled"
                            label={
                              busyRequestId === request.request_id
                                ? undefined
                                : "Accept"
                            }
                            disabled={
                              busyRequestId !== null &&
                              busyRequestId !== request.request_id
                            }
                            onPress={() =>
                              handleRespond(request.request_id, true)
                            }
                          >
                            {busyRequestId === request.request_id ? (
                              <ActivityIndicator size="small" />
                            ) : null}
                          </Button>
                          <Button
                            testID={`decline-request-${request.username}`}
                            variant="outlined"
                            label={
                              busyRequestId === request.request_id
                                ? undefined
                                : "Decline"
                            }
                            disabled={
                              busyRequestId !== null &&
                              busyRequestId !== request.request_id
                            }
                            onPress={() =>
                              handleRespond(request.request_id, false)
                            }
                          >
                            {busyRequestId === request.request_id ? (
                              <ActivityIndicator size="small" />
                            ) : null}
                          </Button>
                        </Row>
                      }
                    />
                  ))}
                  {outgoing.map((request) => (
                    <ProfileListItem
                      key={request.request_id}
                      testID={`outgoing-request-${request.username}`}
                      displayName={request.display_name}
                      username={request.username}
                      trailing={
                        <Button
                          testID={`cancel-request-${request.username}`}
                          variant="outlined"
                          label={
                            busyRequestId === request.request_id
                              ? undefined
                              : "Cancel"
                          }
                          disabled={
                            busyRequestId !== null &&
                            busyRequestId !== request.request_id
                          }
                          onPress={() => handleCancel(request.request_id)}
                        >
                          {busyRequestId === request.request_id ? (
                            <ActivityIndicator size="small" />
                          ) : null}
                        </Button>
                      }
                    />
                  ))}
                </FieldGroup.Section>
              ) : null}
              {friends.length > 0 ? (
                <FieldGroup.Section
                  title={hasRequests ? "Friends" : undefined}
                  testID={hasRequests ? "friends-section" : undefined}
                >
                  {friends.map((item) => (
                    <ProfileListItem
                      key={item.id}
                      testID={`friend-row-${item.username}`}
                      displayName={item.display_name}
                      username={item.username}
                      subtitle={formatFriendsSince(item.friends_since)}
                    />
                  ))}
                </FieldGroup.Section>
              ) : null}
            </FieldGroup>
          </>
        )}
      </Host>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Add Friend"
          onPress={() => router.push("/(app)/friends/search")}
        >
          Add Friend
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
