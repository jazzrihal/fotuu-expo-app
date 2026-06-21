import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Column, Host, RNHostView, ScrollView, Text } from '@expo/ui';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { FeedPost } from '@/lib/posts';

type FeedPostDetail = FeedPost & { imageUrl?: string };

function formatCapturedAt(value: string): string {
  return new Date(value).toLocaleString();
}

export default function PostDetailScreen() {
  const { width, height } = useWindowDimensions();
  const { post: postParam } = useLocalSearchParams<{ id: string; post?: string }>();

  const post = useMemo<FeedPostDetail | null>(() => {
    if (!postParam || typeof postParam !== 'string') {
      return null;
    }

    try {
      return JSON.parse(postParam) as FeedPostDetail;
    } catch {
      return null;
    }
  }, [postParam]);

  if (!post) {
    return (
      <>
        <Stack.Screen options={{ title: '', headerLargeTitle: false }} />
        <Host style={{ flex: 1, padding: 24 }}>
          <Text>Post not found.</Text>
        </Host>
      </>
    );
  }

  const locationLine = [post.address, post.city, post.region].filter(Boolean).join(', ');

  return (
    <>
      <Stack.Screen options={{ title: '', headerLargeTitle: false }} />
      <Host testID="home-post-detail" style={{ flex: 1 }}>
        <ScrollView>
          <RNHostView matchContents>
            <Image
              testID="home-post-detail-image"
              source={post.imageUrl ? { uri: post.imageUrl } : undefined}
              style={{ width, height: height * 0.65 }}
              contentFit="cover"
            />
          </RNHostView>
          <Column spacing={8} style={{ padding: 24 }}>
            <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>{post.display_name}</Text>
            <Text>{formatCapturedAt(post.captured_at)}</Text>
            {locationLine ? <Text>{locationLine}</Text> : null}
            {post.caption ? <Text>{post.caption}</Text> : null}
          </Column>
        </ScrollView>
      </Host>
    </>
  );
}
