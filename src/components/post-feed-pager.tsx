import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostFeedPage } from "@/components/post-feed-page";
import type { PostDetailTestIDPrefix } from "@/lib/navigation";
import type { PostDetailWithImage } from "@/queries/posts";

type PostFeedPagerProps = {
  posts: PostDetailWithImage[];
  testIDPrefix: PostDetailTestIDPrefix | "post";
  testID?: string;
  initialIndex?: number;
  includeTabBarInset?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  isLocalOnly?: boolean;
  localPostIds?: Set<string>;
};

const NATIVE_TAB_BAR_HEIGHT = Platform.select({
  ios: 49,
  android: 56,
  default: 49,
}) as number;

export function PostFeedPager({
  posts,
  testIDPrefix,
  testID,
  initialIndex,
  includeTabBarInset = false,
  refreshing,
  onRefresh,
  isLocalOnly = false,
  localPostIds,
}: PostFeedPagerProps) {
  const [pageHeight, setPageHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<PostDetailWithImage>>(null);
  const didScrollToInitial = useRef(false);

  const bottomInset =
    insets.bottom + (includeTabBarInset ? NATIVE_TAB_BAR_HEIGHT : 0);
  const pagerTestID = testID ?? `${testIDPrefix}-feed-pager`;
  const scrollIndex =
    initialIndex != null && initialIndex >= 0 ? initialIndex : undefined;

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const nextHeight = Math.round(event.nativeEvent.layout.height);
      if (nextHeight > 0) {
        setPageHeight(nextHeight);
      }
    },
    [],
  );

  useEffect(() => {
    if (
      didScrollToInitial.current ||
      scrollIndex == null ||
      pageHeight <= 0 ||
      posts.length <= scrollIndex
    ) {
      return;
    }

    didScrollToInitial.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: scrollIndex,
        animated: false,
      });
    });
  }, [pageHeight, posts.length, scrollIndex]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PostDetailWithImage>) => (
      <PostFeedPage
        post={item}
        testIDPrefix={testIDPrefix}
        pageHeight={pageHeight}
        bottomInset={bottomInset}
        isLocalOnly={isLocalOnly || (localPostIds?.has(item.id) ?? false)}
      />
    ),
    [bottomInset, isLocalOnly, localPostIds, pageHeight, testIDPrefix],
  );

  const getItemLayout = useCallback(
    (
      _data: ArrayLike<PostDetailWithImage> | null | undefined,
      index: number,
    ) => ({
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
          ref={listRef}
          testID={pagerTestID}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialScrollIndex={scrollIndex}
          snapToInterval={pageHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          pagingEnabled
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          refreshing={refreshing}
          onRefresh={onRefresh}
          onScrollToIndexFailed={(info) => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: false,
              });
            });
          }}
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
