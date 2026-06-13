import { useCallback, useState } from 'react';
import { ActivityIndicator, Text as RNText, View, useWindowDimensions } from 'react-native';
import { Host, ScrollView, Text } from '@expo/ui';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { getPostImageUrls, listVisiblePosts, type VisiblePost } from '@/lib/posts';

const GRID_COLUMNS = 3;

type FeedPost = VisiblePost & { imageUrl?: string };

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cellSize = width / GRID_COLUMNS;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    setError(null);

    const { data, error: listError } = await listVisiblePosts();
    if (listError) {
      setError(listError);
      setPosts([]);
      setLoading(false);
      return;
    }

    const visiblePosts = data ?? [];
    const paths = visiblePosts.map((post) => post.storage_object_path);
    const { data: imageUrls, error: urlError } = await getPostImageUrls(paths);

    if (urlError) {
      setError(urlError);
      setPosts([]);
      setLoading(false);
      return;
    }

    setPosts(
      visiblePosts.map((post) => ({
        ...post,
        imageUrl: imageUrls[post.storage_object_path],
      })),
    );
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [loadFeed]),
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Host testID="home-feed" style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text testID="home-feed-error" style={{ padding: 24 }}>
            {error}
          </Text>
        ) : posts.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <RNText testID="home-feed-empty">No posts yet.</RNText>
          </View>
        ) : (
          <ScrollView>
            <View
              testID="home-feed-grid"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
              }}
            >
              {posts.map((post) => (
                <Image
                  key={post.id}
                  testID={`home-feed-post-${post.id}`}
                  source={post.imageUrl ? { uri: post.imageUrl } : undefined}
                  style={{ width: cellSize, height: cellSize }}
                  contentFit="cover"
                />
              ))}
            </View>
          </ScrollView>
        )}
      </Host>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="New post"
          icon="plus"
          onPress={() => router.push('/(app)/home/new-post')}
        />
      </Stack.Toolbar>
    </>
  );
}
