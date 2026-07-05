import { StyleSheet, View } from 'react-native';
import { RNHostView } from '@expo/ui';
import {
  FRIENDS_FEED_SECTION_ROW_INSET,
  FriendsFeedThumbnailRow,
} from '@/components/friends/friends-feed-thumbnail-row';
import type { FriendsPostWithImage } from '@/queries/posts';

export type FriendsFeedThumbnailSlotProps = {
  posts: FriendsPostWithImage[];
  screenWidth: number;
  rowHeight: number;
  testIDPrefix: string;
  onPostPress: (post: FriendsPostWithImage) => void;
};

export function FriendsFeedThumbnailSlot({
  posts,
  screenWidth,
  rowHeight,
  testIDPrefix,
  onPostPress,
}: FriendsFeedThumbnailSlotProps) {
  return (
    <RNHostView matchContents>
      <View
        style={[
          styles.slot,
          {
            width: screenWidth,
            height: rowHeight,
            marginHorizontal: -FRIENDS_FEED_SECTION_ROW_INSET,
          },
        ]}
      >
        <FriendsFeedThumbnailRow
          posts={posts}
          screenWidth={screenWidth}
          testIDPrefix={testIDPrefix}
          onPostPress={onPostPress}
        />
      </View>
    </RNHostView>
  );
}

const styles = StyleSheet.create({
  slot: {
    overflow: 'hidden',
  },
});
