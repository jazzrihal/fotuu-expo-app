import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text as RNText,
} from "react-native";
import { Button, Column, FieldGroup, Host, RNHostView, Row, Text } from "@expo/ui";
import { Empty } from "@/components/empty";
import { FriendsCountBar } from "@/components/friends/friends-count-bar";
import { ProfileListItem } from "@/components/profile-list-item";
import { SwipeableProfileListItem } from "@/components/swipeable-profile-list-item";
import type { ProfileSearchResult } from "@/lib/friends";
import {
  parseRelationshipStatus,
  type RelationshipKind,
} from "@/lib/relationship-status";
import {
  useCancelFriendRequestMutation,
  useFriendsQuery,
  useIncomingRequestsQuery,
  useOutgoingRequestsQuery,
  useProfileSearchQuery,
  useRemoveFriendMutation,
  useRespondToFriendRequestMutation,
  useSendFriendRequestMutation,
} from "@/queries/friends";
import { queryKeys } from "@/queries/keys";
import { useRefreshOnFocus } from "@/queries/useRefreshOnFocus";

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

function formatFriendsSince(iso: string) {
  try {
    return `Friends since ${new Date(iso).toLocaleDateString()}`;
  } catch {
    return undefined;
  }
}

type FriendsListTabProps = {
  query: string;
  isSearchOpen: boolean;
};

export function FriendsListTab({ query, isSearchOpen }: FriendsListTabProps) {
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const friendsQuery = useFriendsQuery();
  const incomingQuery = useIncomingRequestsQuery();
  const outgoingQuery = useOutgoingRequestsQuery();
  const searchQuery = useProfileSearchQuery(debouncedQuery, {
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
  });

  const respondMutation = useRespondToFriendRequestMutation();
  const cancelMutation = useCancelFriendRequestMutation();
  const sendMutation = useSendFriendRequestMutation();
  const removeFriendMutation = useRemoveFriendMutation();

  useRefreshOnFocus(queryKeys.friends(), ["friend-requests"]);

  const trimmedQuery = query.trim();
  const isSearchActive = trimmedQuery.length >= MIN_QUERY_LENGTH;

  const friends = friendsQuery.data ?? [];
  const incoming = incomingQuery.data ?? [];
  const outgoing = outgoingQuery.data ?? [];
  const searchResults = searchQuery.data ?? [];

  const loading =
    friendsQuery.isPending ||
    incomingQuery.isPending ||
    outgoingQuery.isPending;
  const error =
    friendsQuery.error?.message ??
    incomingQuery.error?.message ??
    outgoingQuery.error?.message ??
    null;

  const busyRequestId = respondMutation.isPending
    ? (respondMutation.variables?.requestId ?? null)
    : cancelMutation.isPending
      ? (cancelMutation.variables ?? null)
      : null;

  const busyProfileId = sendMutation.isPending
    ? (sendMutation.variables ?? null)
    : null;

  const busyFriendId = removeFriendMutation.isPending
    ? (removeFriendMutation.variables ?? null)
    : null;

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  function handleRespond(requestId: string, accept: boolean) {
    respondMutation.mutate({ requestId, accept });
  }

  function handleCancel(requestId: string) {
    cancelMutation.mutate(requestId);
  }

  function handleSendRequest(profileId: string) {
    sendMutation.mutate(profileId);
  }

  function handleRemoveFriend(friendId: string) {
    removeFriendMutation.mutate(friendId);
  }

  const hasRequests = incoming.length > 0 || outgoing.length > 0;
  const searchError =
    searchQuery.error?.message ?? sendMutation.error?.message ?? null;
  const showCountBar = !isSearchOpen && !loading && !error;

  let hostContent: React.ReactNode;

  if (isSearchOpen) {
    hostContent = isSearchActive ? (
      searchQuery.isPending ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : searchError ? (
        <Text testID="friends-search-error">{searchError}</Text>
      ) : searchResults.length === 0 ? (
        <Empty
          testID="friends-search-empty"
          title="No profiles found"
          description="Try a different search term."
        />
      ) : (
        <FieldGroup>
          <FieldGroup.Section testID="friends-search-results">
            {searchResults.map((item) => {
              const relationship = parseRelationshipStatus(
                item.relationship_status,
              );
              return (
                <ProfileListItem
                  key={item.id}
                  testID={`search-result-${item.username}`}
                  profileId={item.id}
                  displayName={item.display_name}
                  username={item.username}
                  relationship={relationship}
                  trailing={searchTrailingAction({
                    profile: item,
                    relationship,
                    busyProfileId,
                    onSendRequest: handleSendRequest,
                  })}
                />
              );
            })}
          </FieldGroup.Section>
        </FieldGroup>
      )
    ) : null;
  } else if (error) {
    hostContent = (
      <Column spacing={12} style={{ padding: 24 }}>
        <RNText testID="friends-error" selectable>
          {error}
        </RNText>
        <Button
          variant="text"
          label="Try again"
          onPress={() => {
            void friendsQuery.refetch();
            void incomingQuery.refetch();
            void outgoingQuery.refetch();
          }}
        />
      </Column>
    );
  } else if (!hasRequests && friends.length === 0) {
    hostContent = (
      <Empty
        testID="friends-empty"
        title="No friends yet"
        description="Search for people to send a request."
      />
    );
  } else {
    hostContent = (
      <FieldGroup>
        {hasRequests ? (
          <FieldGroup.Section title="Pending" testID="friends-requests-pending">
            {incoming.map((request) => (
              <SwipeableProfileListItem
                key={request.request_id}
                testID={`incoming-request-${request.username}`}
                profileId={request.id}
                displayName={request.display_name}
                username={request.username}
                leadingActions={[
                  {
                    label: "Accept",
                    disabled:
                      busyRequestId !== null &&
                      busyRequestId !== request.request_id,
                    onPress: () => handleRespond(request.request_id, true),
                  },
                ]}
                trailingActions={[
                  {
                    label: "Decline",
                    disabled:
                      busyRequestId !== null &&
                      busyRequestId !== request.request_id,
                    onPress: () => handleRespond(request.request_id, false),
                  },
                  ,
                ]}
                trailing={
                  <Row spacing={8} alignment="center">
                    <Button
                      testID={`accept-request-${request.username}`}
                      variant="filled"
                      label={
                        busyRequestId === request.request_id
                          ? "Accepting…"
                          : "Accept"
                      }
                      disabled={busyRequestId !== null}
                      onPress={() => handleRespond(request.request_id, true)}
                    />
                    <Button
                      testID={`decline-request-${request.username}`}
                      variant="outlined"
                      label={
                        busyRequestId === request.request_id
                          ? "Declining…"
                          : "Decline"
                      }
                      disabled={busyRequestId !== null}
                      onPress={() => handleRespond(request.request_id, false)}
                    />
                  </Row>
                }
              />
            ))}
            {outgoing.map((request) => (
              <SwipeableProfileListItem
                key={request.request_id}
                testID={`outgoing-request-${request.username}`}
                profileId={request.id}
                displayName={request.display_name}
                username={request.username}
                trailingActions={[
                  {
                    label: "Cancel",
                    disabled:
                      busyRequestId !== null &&
                      busyRequestId !== request.request_id,
                    onPress: () => handleCancel(request.request_id),
                  },
                ]}
                trailing={
                  <Button
                    testID={`cancel-request-${request.username}`}
                    variant="outlined"
                    label={
                      busyRequestId === request.request_id
                        ? "Canceling…"
                        : "Cancel"
                    }
                    disabled={busyRequestId !== null}
                    onPress={() => handleCancel(request.request_id)}
                  />
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
              <SwipeableProfileListItem
                key={item.id}
                testID={`friend-row-${item.username}`}
                profileId={item.id}
                displayName={item.display_name}
                username={item.username}
                subtitle={formatFriendsSince(item.friends_since)}
                trailingActions={[
                  {
                    label: "Remove",
                    role: "destructive",
                    disabled:
                      busyFriendId !== null && busyFriendId !== item.id,
                    onPress: () => handleRemoveFriend(item.id),
                  },
                ]}
              />
            ))}
          </FieldGroup.Section>
        ) : null}
      </FieldGroup>
    );
  }

  const hostBody = showCountBar ? (
    <Column>
      <RNHostView matchContents>
        <FriendsCountBar count={friends.length} />
      </RNHostView>
      {hostContent}
    </Column>
  ) : (
    hostContent
  );

  return (
    <View style={styles.container}>
      {!isSearchOpen && loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <Host
          key={isSearchOpen ? "search" : "list"}
          testID="friends-list"
          style={styles.listHost}
          useViewportSizeMeasurement
        >
          {hostBody}
        </Host>
      )}
    </View>
  );
}

function searchTrailingAction({
  profile,
  relationship,
  busyProfileId,
  onSendRequest,
}: {
  profile: ProfileSearchResult;
  relationship: RelationshipKind;
  busyProfileId: string | null;
  onSendRequest: (profileId: string) => void;
}) {
  switch (relationship) {
    case "self":
      return null;
    case "friends":
      return <Text>Friends</Text>;
    case "outgoing_request":
      return <Text>Pending</Text>;
    case "incoming_request":
      return <Text>Respond</Text>;
    case "none":
    case "unknown":
      return (
        <Button
          testID={`send-request-${profile.username}`}
          variant="filled"
          label={busyProfileId === profile.id ? "Adding…" : "Add"}
          disabled={busyProfileId !== null}
          onPress={() => onSendRequest(profile.id)}
        />
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listHost: {
    flex: 1,
  },
});
