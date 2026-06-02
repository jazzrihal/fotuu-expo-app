import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Link, Stack, useFocusEffect } from 'expo-router';
import { ProfileListItem } from '@/components/profile-list-item';
import { listFriends } from '@/lib/friends';
import type { Friend } from '@/types/supabase';

function formatFriendsSince(iso: string) {
  try {
    return `Friends since ${new Date(iso).toLocaleDateString()}`;
  } catch {
    return undefined;
  }
}

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFriends = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const { data, error: loadError } = await listFriends();
    if (loadError) setError(loadError);
    else setFriends(data ?? []);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends]),
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Friends' }} />
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
          }}
        >
          <Link href="/(app)/friends/search" asChild>
            <Pressable
              testID="friends-search-link"
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
                borderRadius: 10,
                borderCurve: 'continuous',
                padding: 12,
                alignItems: 'center',
              })}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Find people</Text>
            </Pressable>
          </Link>
          <Link href="/(app)/friends/requests" asChild>
            <Pressable
              testID="friends-requests-link"
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? '#E5E7EB' : '#F3F4F6',
                borderRadius: 10,
                borderCurve: 'continuous',
                padding: 12,
                alignItems: 'center',
              })}
            >
              <Text style={{ color: '#374151', fontWeight: '600' }}>Requests</Text>
            </Pressable>
          </Link>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={{ padding: 24, gap: 12 }}>
            <Text testID="friends-error" style={{ color: '#DC2626', fontSize: 14 }}>
              {error}
            </Text>
            <Pressable onPress={() => loadFriends()}>
              <Text style={{ color: '#2563EB', fontWeight: '600' }}>Try again</Text>
            </Pressable>
          </View>
        ) : friends.length === 0 ? (
          <Text
            testID="friends-empty"
            style={{ padding: 24, fontSize: 15, color: '#6B7280', textAlign: 'center' }}
          >
            No friends yet. Search for people to send a request.
          </Text>
        ) : (
          <FlatList
            testID="friends-list"
            data={friends}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadFriends(true)} />
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
