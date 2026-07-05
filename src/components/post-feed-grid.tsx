import { useCallback, useMemo, type ReactElement } from "react";
import {
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SymbolView } from "expo-symbols";
import { Image } from "@/components/image";
import type { LocalPostStatus } from "@/lib/post-db";

const GRID_COLUMNS = 3;
const GRID_GAP = 1;

export type PostGridItem = {
  id: string;
  imageUrl?: string;
  isLocal?: boolean;
  syncStatus?: LocalPostStatus;
};

type PostFeedGridProps<T extends PostGridItem> = {
  posts: T[];
  onPostPress: (post: T) => void;
  testIDPrefix: string;
  testID?: string;
  ListHeaderComponent?: ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentInsetAdjustmentBehavior?: "automatic" | "never";
};

export function PostFeedGrid<T extends PostGridItem>({
  posts,
  onPostPress,
  testIDPrefix,
  testID,
  ListHeaderComponent,
  refreshing,
  onRefresh,
  contentInsetAdjustmentBehavior = "never",
}: PostFeedGridProps<T>) {
  const colorScheme = useColorScheme();
  const gridSeparatorColor = colorScheme === "dark" ? "#000" : "#fff";
  const { width: screenWidth } = useWindowDimensions();
  const { tileSize, lastColumnWidth } = useMemo(() => {
    const baseTileSize = Math.floor(
      (screenWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
    );
    const gridWidth =
      baseTileSize * GRID_COLUMNS + GRID_GAP * (GRID_COLUMNS - 1);
    return {
      tileSize: baseTileSize,
      lastColumnWidth: baseTileSize + (screenWidth - gridWidth),
    };
  }, [screenWidth]);

  const renderGridItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      const isLastColumn = index % GRID_COLUMNS === GRID_COLUMNS - 1;
      const itemWidth = isLastColumn ? lastColumnWidth : tileSize;

      return (
        <Pressable
          testID={`${testIDPrefix}-post-${item.id}`}
          onPress={() => onPostPress(item)}
          style={{
            width: itemWidth,
            height: tileSize,
            marginRight: isLastColumn ? 0 : GRID_GAP,
            marginBottom: GRID_GAP,
          }}
        >
          <Image
            recyclingKey={item.id}
            source={item.imageUrl ? { uri: item.imageUrl } : undefined}
            style={{ width: itemWidth, height: tileSize }}
            contentFit="cover"
          />
          {item.isLocal ? (
            <View testID="local-post-thumbnail" style={styles.offlineBadge} pointerEvents="none">
              <SymbolView
                name={item.syncStatus === 'uploading' ? 'icloud.and.arrow.up' : 'icloud.slash'}
                size={18}
                tintColor="#FFFFFF"
                accessibilityLabel={
                  item.syncStatus === 'uploading' ? 'Uploading' : 'Not uploaded'
                }
              />
            </View>
          ) : null}
        </Pressable>
      );
    },
    [lastColumnWidth, onPostPress, testIDPrefix, tileSize],
  );

  return (
    <FlashList
      testID={testID}
      data={posts}
      numColumns={GRID_COLUMNS}
      keyExtractor={(item) => item.id}
      renderItem={renderGridItem}
      style={{ flex: 1, backgroundColor: gridSeparatorColor }}
      contentContainerStyle={styles.gridContent}
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      ListHeaderComponent={ListHeaderComponent}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}

const styles = StyleSheet.create({
  gridContent: {
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  offlineBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    padding: 4,
  },
});
