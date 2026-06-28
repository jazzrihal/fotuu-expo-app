import { use, useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Column, Host, RNHostView, ScrollView, Text } from '@expo/ui';
import { Image } from '@/components/image';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { TabBarContext } from '@/context/tab-bar';
import type { FeedPost } from '@/lib/posts';

type FeedPostDetail = FeedPost & { imageUrl?: string };

function formatCapturedAt(value: string): string {
  return new Date(value).toLocaleString();
}

export default function PostDetailScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setIsTabBarHidden } = use(TabBarContext);
  const { post: postParam } = useLocalSearchParams<{ id: string; post?: string }>();

  useFocusEffect(
    useCallback(() => {
      setIsTabBarHidden(true);
      return () => setIsTabBarHidden(false);
    }, [setIsTabBarHidden]),
  );

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
      <Host
        testID="home-post-detail"
        style={{ flex: 1, paddingBottom: insets.bottom }}
        useViewportSizeMeasurement
      >
        <Column>
          <RNHostView matchContents>
            <Image
              testID="home-post-detail-image"
              source={post.imageUrl ? { uri: post.imageUrl } : undefined}
              style={{ width, height: (height * 2) / 3 }}
              contentFit="cover"
            />
          </RNHostView>

          <Column spacing={4} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text testID="home-post-detail-author" textStyle={{ fontWeight: '600' }}>
              {post.display_name}
            </Text>
            {locationLine ? (
              <Text testID="home-post-detail-location">{locationLine}</Text>
            ) : null}
            <Text testID="home-post-detail-date">{formatCapturedAt(post.captured_at)}</Text>
          </Column>

          <Host style={{ flex: 1 }}>
            <ScrollView>
              <Column style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                {post.caption ? (
                  <Text testID="home-post-detail-caption">{post.caption}</Text>
                ) : null}
              </Column>
            </ScrollView>
          </Host>
        </Column>
      </Host>
    </>
  );
}
