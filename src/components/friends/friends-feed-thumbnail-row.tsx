import {
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from '@/components/image';
import { PinnedPostBadge } from '@/components/pinned-post-badge';
import type { FriendsPostWithImage } from '@/queries/posts';

/** Horizontal inset applied by FieldGroup.Section rows on web. */
export const FRIENDS_FEED_SECTION_ROW_INSET = 16;

/** Default SwiftUI Form row insets to counter on iOS via listRowInsets. */
export const FRIENDS_FEED_IOS_LIST_ROW_BLEED = {
  horizontal: 20,
  vertical: 12,
};

const ANDROID_LIST_ITEM_INSET = { horizontal: 16, vertical: 8 };
const ANDROID_LIST_ITEM_MIN_HEIGHT = 56;

export function getFriendsFeedAndroidListItemOffset(rowHeight: number): {
  x: number;
  y: number;
} {
  const minHeightGap =
    rowHeight < ANDROID_LIST_ITEM_MIN_HEIGHT
      ? (ANDROID_LIST_ITEM_MIN_HEIGHT - rowHeight) / 2
      : 0;

  return {
    x: -ANDROID_LIST_ITEM_INSET.horizontal,
    y: -(ANDROID_LIST_ITEM_INSET.vertical + minHeightGap),
  };
}

const GRID_GAP = 1;
const FRIENDS_FEED_COLUMNS = 3;
export const FRIENDS_FEED_ROW_GAP = GRID_GAP;

/** Clears rounded FieldGroup row corners (overflow: hidden on slot). */
const FRIENDS_FEED_PIN_BADGE_INSET = { bottom: 18, right: 18 };

function getFriendsFeedThumbnailLayout(postCount: number, screenWidth: number) {
  if (postCount === 0) {
    return { tileSize: 0, lastTileWidth: 0 };
  }

  const tileSize = Math.floor(
    (screenWidth - GRID_GAP * (postCount - 1)) / postCount,
  );
  const distributedWidth = tileSize * postCount + GRID_GAP * (postCount - 1);

  return {
    tileSize,
    lastTileWidth: tileSize + (screenWidth - distributedWidth),
  };
}

export function getFriendsFeedThumbnailRowHeight(
  _postCount: number,
  screenWidth: number,
): number {
  void _postCount;
  return getFriendsFeedThumbnailLayout(FRIENDS_FEED_COLUMNS, screenWidth).tileSize;
}

type FriendsFeedThumbnailRowProps = {
  posts: FriendsPostWithImage[];
  testID: string;
  testIDPrefix: string;
  onPostPress: (post: FriendsPostWithImage) => void;
  screenWidth?: number;
};

export function FriendsFeedThumbnailRow({
  posts,
  testID,
  testIDPrefix,
  onPostPress,
  screenWidth: screenWidthProp,
}: FriendsFeedThumbnailRowProps) {
  const colorScheme = useColorScheme();
  const gridSeparatorColor = colorScheme === 'dark' ? '#000' : '#fff';
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = screenWidthProp ?? windowWidth;
  const { tileSize, lastTileWidth } = getFriendsFeedThumbnailLayout(
    posts.length,
    screenWidth,
  );
  const rowTileHeight = getFriendsFeedThumbnailRowHeight(
    FRIENDS_FEED_COLUMNS,
    screenWidth,
  );

  if (posts.length === 0) {
    return null;
  }

  return (
    <View
      testID={testID}
      style={[
        styles.row,
        {
          width: screenWidth,
          height: rowTileHeight,
          backgroundColor: gridSeparatorColor,
        },
      ]}
    >
      {posts.map((post, index) => {
        const isLast = index === posts.length - 1;
        const tileWidth = isLast ? lastTileWidth : tileSize;

        return (
          <Pressable
            key={post.id}
            testID={`${testIDPrefix}-post-${post.id}`}
            onPress={() => onPostPress(post)}
            style={{
              width: tileWidth,
              height: rowTileHeight,
              marginRight: isLast ? 0 : GRID_GAP,
            }}
          >
            <Image
              recyclingKey={post.id}
              source={post.imageUrl ? { uri: post.imageUrl } : undefined}
              style={{ width: tileWidth, height: rowTileHeight }}
              contentFit="cover"
            />
            {post.is_pinned_by_current_user ? (
              <PinnedPostBadge style={styles.pinnedBadge} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  pinnedBadge: FRIENDS_FEED_PIN_BADGE_INSET,
});
