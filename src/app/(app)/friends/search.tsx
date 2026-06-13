import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, type NativeSyntheticEvent, type TextInputFocusEventData } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';
import { Button, FieldGroup, Host, Text } from '@expo/ui';
import { Stack, useFocusEffect, useNavigation } from 'expo-router';
import { ProfileListItem } from '@/components/profile-list-item';
import {
  searchProfiles,
  sendFriendRequest,
  type ProfileSearchResult,
} from '@/lib/friends';
import { parseRelationshipStatus, type RelationshipKind } from '@/lib/relationship-status';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export default function SearchFriendsScreen() {
  const navigation = useNavigation();
  const searchBarRef = useRef<SearchBarCommands>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const isSearchActive = trimmedQuery.length >= MIN_QUERY_LENGTH;

  const runSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: searchError } = await searchProfiles(trimmed);
    if (searchError) setError(searchError);
    else setResults(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerSearchBarOptions: {
          ref: searchBarRef,
          placeholder: 'Search by username or name',
          autoCapitalize: 'none',
          autoFocus: true,
          hideWhenScrolling: false,
          placement: 'inline',
          onChangeText: (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
            setQuery(event.nativeEvent.text);
          },
          onCancelButtonPress: () => {
            setQuery('');
          },
        },
      });

      const focusTimer = setTimeout(() => {
        searchBarRef.current?.focus();
      }, 100);

      return () => clearTimeout(focusTimer);
    }, [navigation]),
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  async function handleSendRequest(profileId: string) {
    setBusyProfileId(profileId);
    setError(null);
    const { error: sendError } = await sendFriendRequest(profileId);
    setBusyProfileId(null);
    if (sendError) {
      setError(sendError);
      return;
    }
    await runSearch(query);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Search' }} />
      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        {isSearchActive ? (
          <FieldGroup>
            <FieldGroup.Section testID="friends-search-results">
              {loading ? (
                <Text>Searching…</Text>
              ) : error ? (
                <Text testID="friends-search-error">{error}</Text>
              ) : results.length === 0 ? (
                <Text testID="friends-search-empty">No profiles found.</Text>
              ) : (
                results.map((item) => {
                  const relationship = parseRelationshipStatus(item.relationship_status);
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
        ) : null}
      </Host>
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
          label={busyProfileId === profile.id ? undefined : 'Add'}
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
