import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  type NativeSyntheticEvent,
  Text as RNText,
  type TextInputFocusEventData,
} from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';
import { Button, Column, FieldGroup, Host, Row, Text } from '@expo/ui';
import { useNavigation } from 'expo-router';
import { Empty } from '@/components/empty';
import { ProfileListItem } from '@/components/profile-list-item';
import { SwipeableProfileListItem } from '@/components/swipeable-profile-list-item';
import type { ProfileSearchResult } from '@/lib/friends';
import {
  parseRelationshipStatus,
  type RelationshipKind,
} from '@/lib/relationship-status';
import {
  useCancelFriendRequestMutation,
  useFriendsQuery,
  useIncomingRequestsQuery,
  useOutgoingRequestsQuery,
  useProfileSearchQuery,
  useRemoveFriendMutation,
  useRespondToFriendRequestMutation,
  useSendFriendRequestMutation,
} from '@/queries/friends';
import { queryKeys } from '@/queries/keys';
import { useRefreshOnFocus } from '@/queries/useRefreshOnFocus';

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
  isSearchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
};

export function FriendsListTab({
  isSearchOpen,
  onSearchOpenChange,
}: FriendsListTabProps) {
  const navigation = useNavigation();
  const searchBarRef = useRef<SearchBarCommands>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

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

  useRefreshOnFocus(queryKeys.friends(), ['friend-requests']);

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

  const busyRequestId =
    respondMutation.isPending
      ? respondMutation.variables?.requestId ?? null
      : cancelMutation.isPending
        ? cancelMutation.variables ?? null
        : null;

  const busyProfileId = sendMutation.isPending
    ? (sendMutation.variables ?? null)
    : null;

  const busyFriendId = removeFriendMutation.isPending
    ? (removeFriendMutation.variables ?? null)
    : null;

  useEffect(() => {
    if (!isSearchOpen) {
      navigation.setOptions({ headerSearchBarOptions: undefined });
      return;
    }

    navigation.setOptions({
      headerSearchBarOptions: {
        ref: searchBarRef,
        placeholder: 'Search by username or name',
        autoCapitalize: 'none',
        autoFocus: true,
        hideWhenScrolling: false,
        placement: 'inline',
        onChangeText: (
          event: NativeSyntheticEvent<TextInputFocusEventData>,
        ) => {
          setQuery(event.nativeEvent.text);
        },
        onCancelButtonPress: () => {
          setQuery('');
          setDebouncedQuery('');
          onSearchOpenChange(false);
        },
      },
    });

    const focusTimer = setTimeout(() => {
      searchBarRef.current?.focus();
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [isSearchOpen, navigation, onSearchOpenChange]);

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

  return (
    <Host
      testID="friends-list"
      style={styles.listHost}
      useViewportSizeMeasurement
    >
      {isSearchOpen ? (
        isSearchActive ? (
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
            onPress={() => {
              void friendsQuery.refetch();
              void incomingQuery.refetch();
              void outgoingQuery.refetch();
            }}
          />
        </Column>
      ) : !hasRequests && friends.length === 0 ? (
        <Empty
          testID="friends-empty"
          title="No friends yet"
          description="Search for people to send a request."
        />
      ) : (
        <FieldGroup>
          {hasRequests ? (
            <FieldGroup.Section
              title="Pending"
              testID="friends-requests-pending"
            >
              {incoming.map((request) => (
                <SwipeableProfileListItem
                  key={request.request_id}
                  testID={`incoming-request-${request.username}`}
                  profileId={request.id}
                  displayName={request.display_name}
                  username={request.username}
                  actionLabel="Decline"
                  actionDisabled={
                    busyRequestId !== null &&
                    busyRequestId !== request.request_id
                  }
                  onAction={() => handleRespond(request.request_id, false)}
                  trailing={
                    <Row spacing={8} alignment="center">
                      <Button
                        testID={`accept-request-${request.username}`}
                        variant="filled"
                        label={
                          busyRequestId === request.request_id
                            ? 'Accepting…'
                            : 'Accept'
                        }
                        disabled={busyRequestId !== null}
                        onPress={() =>
                          handleRespond(request.request_id, true)
                        }
                      />
                      <Button
                        testID={`decline-request-${request.username}`}
                        variant="outlined"
                        label={
                          busyRequestId === request.request_id
                            ? 'Declining…'
                            : 'Decline'
                        }
                        disabled={busyRequestId !== null}
                        onPress={() =>
                          handleRespond(request.request_id, false)
                        }
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
                  actionLabel="Cancel"
                  actionDisabled={
                    busyRequestId !== null &&
                    busyRequestId !== request.request_id
                  }
                  onAction={() => handleCancel(request.request_id)}
                  trailing={
                    <Button
                      testID={`cancel-request-${request.username}`}
                      variant="outlined"
                      label={
                        busyRequestId === request.request_id
                          ? 'Canceling…'
                          : 'Cancel'
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
              title={hasRequests ? 'Friends' : undefined}
              testID={hasRequests ? 'friends-section' : undefined}
            >
              {friends.map((item) => (
                <SwipeableProfileListItem
                  key={item.id}
                  testID={`friend-row-${item.username}`}
                  profileId={item.id}
                  displayName={item.display_name}
                  username={item.username}
                  subtitle={formatFriendsSince(item.friends_since)}
                  actionLabel="Remove"
                  actionDisabled={
                    busyFriendId !== null && busyFriendId !== item.id
                  }
                  onAction={() => handleRemoveFriend(item.id)}
                />
              ))}
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      )}
    </Host>
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
    case 'self':
      return null;
    case 'friends':
      return <Text>Friends</Text>;
    case 'outgoing_request':
      return <Text>Pending</Text>;
    case 'incoming_request':
      return <Text>Respond</Text>;
    case 'none':
    case 'unknown':
      return (
        <Button
          testID={`send-request-${profile.username}`}
          variant="filled"
          label={busyProfileId === profile.id ? 'Adding…' : 'Add'}
          disabled={busyProfileId !== null}
          onPress={() => onSendRequest(profile.id)}
        />
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  listHost: {
    flex: 1,
  },
});
