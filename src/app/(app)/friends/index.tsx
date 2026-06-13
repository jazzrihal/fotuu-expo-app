import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  type NativeSyntheticEvent,
  Text as RNText,
  type TextInputFocusEventData,
} from "react-native";
import type { SearchBarCommands } from "react-native-screens";
import { Button, Column, FieldGroup, Host, Row, Text } from "@expo/ui";
import { Stack, useFocusEffect, useNavigation } from "expo-router";
import { ProfileListItem } from "@/components/profile-list-item";
import {
  cancelFriendRequest,
  listFriends,
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  respondToFriendRequest,
  searchProfiles,
  sendFriendRequest,
  type Friend,
  type FriendRequest,
  type ProfileSearchResult,
} from "@/lib/friends";
import {
  parseRelationshipStatus,
  type RelationshipKind,
} from "@/lib/relationship-status";

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

function formatFriendsSince(iso: string) {
  try {
    return `Friends since ${new Date(iso).toLocaleDateString()}`;
  } catch {
    return undefined;
  }
}

export default function FriendsScreen() {
  const navigation = useNavigation();
  const searchBarRef = useRef<SearchBarCommands>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const trimmedQuery = query.trim();
  const isSearchActive = trimmedQuery.length >= MIN_QUERY_LENGTH;

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

  const runSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    const { data, error: nextSearchError } = await searchProfiles(trimmed);
    if (nextSearchError) setSearchError(nextSearchError);
    else setSearchResults(data ?? []);
    setSearchLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    if (!isSearchOpen) {
      navigation.setOptions({ headerSearchBarOptions: undefined });
      return;
    }

    navigation.setOptions({
      headerSearchBarOptions: {
        ref: searchBarRef,
        placeholder: "Search by username or name",
        autoCapitalize: "none",
        autoFocus: true,
        hideWhenScrolling: false,
        placement: "inline",
        onChangeText: (
          event: NativeSyntheticEvent<TextInputFocusEventData>,
        ) => {
          setQuery(event.nativeEvent.text);
        },
        onCancelButtonPress: () => {
          setQuery("");
          setIsSearchOpen(false);
        },
      },
    });

    const focusTimer = setTimeout(() => {
      searchBarRef.current?.focus();
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [isSearchOpen, navigation]);

  useEffect(() => {
    const handle = setTimeout(() => {
      runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

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

  async function handleSendRequest(profileId: string) {
    setBusyProfileId(profileId);
    setSearchError(null);
    const { error: sendError } = await sendFriendRequest(profileId);
    setBusyProfileId(null);
    if (sendError) {
      setSearchError(sendError);
      return;
    }
    await runSearch(query);
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
        {isSearchOpen ? (
          isSearchActive ? (
            <FieldGroup>
              <FieldGroup.Section testID="friends-search-results">
                {searchLoading ? (
                  <Text>Searching…</Text>
                ) : searchError ? (
                  <Text testID="friends-search-error">{searchError}</Text>
                ) : searchResults.length === 0 ? (
                  <Text testID="friends-search-empty">No profiles found.</Text>
                ) : (
                  searchResults.map((item) => {
                    const relationship = parseRelationshipStatus(
                      item.relationship_status,
                    );
                    return (
                      <ProfileListItem
                        key={item.id}
                        testID={`search-result-${item.username}`}
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
                  })
                )}
              </FieldGroup.Section>
            </FieldGroup>
          ) : null
        ) : loading ? (
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
                <FieldGroup.Section
                  title="Pending"
                  testID="friends-requests-pending"
                >
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
          accessibilityLabel="Search"
          hidden={isSearchOpen}
          icon="magnifyingglass"
          onPress={() => setIsSearchOpen(true)}
        />
      </Stack.Toolbar>
    </>
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
          label={busyProfileId === profile.id ? undefined : "Add"}
          disabled={busyProfileId !== null && busyProfileId !== profile.id}
          onPress={() => onSendRequest(profile.id)}
        >
          {busyProfileId === profile.id ? (
            <ActivityIndicator size="small" />
          ) : null}
        </Button>
      );
    default:
      return null;
  }
}
