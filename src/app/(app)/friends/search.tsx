import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { ActionButton } from '@/components/action-button';
import { ProfileListItem } from '@/components/profile-list-item';
import { useAuth } from '@/context/auth';
import { searchProfiles, sendFriendRequest } from '@/lib/friends';
import {
  searchProfileAction,
  searchProfileStatusLabel,
} from '@/lib/search-profile-actions';
import type { SearchProfile } from '@/types/supabase';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export default function SearchFriendsScreen() {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);

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
      <Stack.Screen options={{ title: 'Find people' }} />
      <View style={{ flex: 1 }}>
        <View style={{ padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
          <TextInput
            testID="friends-search-input"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Search by username or name"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 10,
              borderCurve: 'continuous',
              padding: 14,
              fontSize: 16,
              backgroundColor: '#F9FAFB',
            }}
          />
          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>
            Enter at least {MIN_QUERY_LENGTH} characters to search.
          </Text>
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}

        {error ? (
          <Text
            testID="friends-search-error"
            style={{ padding: 16, color: '#DC2626', fontSize: 14 }}
          >
            {error}
          </Text>
        ) : null}

        {!loading && query.trim().length >= MIN_QUERY_LENGTH && results.length === 0 && !error ? (
          <Text
            testID="friends-search-empty"
            style={{ padding: 24, textAlign: 'center', color: '#6B7280', fontSize: 15 }}
          >
            No profiles found.
          </Text>
        ) : null}

        <FlatList
          testID="friends-search-results"
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const action = searchProfileAction(item, session?.user.id);
            const statusLabel = searchProfileStatusLabel(item, session?.user.id);

            return (
              <ProfileListItem
                testID={`search-result-${item.username}`}
                displayName={item.display_name}
                username={item.username}
                subtitle={statusLabel || undefined}
                trailing={searchTrailingAction({
                  profile: item,
                  action,
                  busyProfileId,
                  onSendRequest: handleSendRequest,
                })}
              />
            );
          }}
        />
      </View>
    </>
  );
}

function searchTrailingAction({
  profile,
  action,
  busyProfileId,
  onSendRequest,
}: {
  profile: SearchProfile;
  action: ReturnType<typeof searchProfileAction>;
  busyProfileId: string | null;
  onSendRequest: (profileId: string) => void;
}) {
  switch (action) {
    case 'none':
      return null;
    case 'friends':
      return (
        <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '500' }}>Friends</Text>
      );
    case 'pending':
      return (
        <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '500' }}>Pending</Text>
      );
    case 'respond':
      return (
        <Text style={{ fontSize: 14, color: '#2563EB', fontWeight: '500' }}>Respond</Text>
      );
    case 'add':
      return (
        <ActionButton
          testID={`send-request-${profile.username}`}
          label="Add"
          loading={busyProfileId === profile.id}
          disabled={busyProfileId !== null && busyProfileId !== profile.id}
          onPress={() => onSendRequest(profile.id)}
        />
      );
    default:
      return null;
  }
}
