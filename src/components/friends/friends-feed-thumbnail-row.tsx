import {
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from '@/components/image';
import type { FriendsPostWithImage } from '@/queries/posts';

/** Horizontal inset applied by FieldGroup.SectionFooter on web/Android. */
export const FRIENDS_FEED_SECTION_FOOTER_INSET = 16;

const GRID_GAP = 1;

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
  postCount: number,
  screenWidth: number,
): number {
  return getFriendsFeedThumbnailLayout(postCount, screenWidth).tileSize;
}

type FriendsFeedThumbnailRowProps = {
  posts: FriendsPostWithImage[];
  testIDPrefix: string;
  onPostPress: (post: FriendsPostWithImage) => void;
  screenWidth?: number;
};

export function FriendsFeedThumbnailRow({
  posts,
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

  if (posts.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.row,
        {
          width: screenWidth,
          height: tileSize,
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
              height: tileSize,
              marginRight: isLast ? 0 : GRID_GAP,
            }}
          >
            <Image
              recyclingKey={post.id}
              source={post.imageUrl ? { uri: post.imageUrl } : undefined}
              style={{ width: tileWidth, height: tileSize }}
              contentFit="cover"
            />
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
});
