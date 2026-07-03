import { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FriendsFeedPostPage } from "@/components/friends/friends-feed-post-page";
import type { FriendsPostWithImage } from "@/queries/posts";

type FriendsFeedPagerProps = {
  posts: FriendsPostWithImage[];
  refreshing?: boolean;
  onRefresh?: () => void;
};

const NATIVE_TAB_BAR_HEIGHT = Platform.select({
  ios: 49,
  android: 56,
  default: 49,
}) as number;

export function FriendsFeedPager({
  posts,
  refreshing,
  onRefresh,
}: FriendsFeedPagerProps) {
  const [pageHeight, setPageHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const bottomInset = NATIVE_TAB_BAR_HEIGHT + insets.bottom;

  const handleLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setPageHeight(nextHeight);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FriendsPostWithImage>) => (
      <FriendsFeedPostPage
        post={item}
        pageHeight={pageHeight}
        bottomInset={bottomInset}
      />
    ),
    [bottomInset, pageHeight],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<FriendsPostWithImage> | null | undefined, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight],
  );

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {pageHeight > 0 ? (
        <FlatList
          testID="friends-feed-pager"
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          snapToInterval={pageHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          pagingEnabled
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
