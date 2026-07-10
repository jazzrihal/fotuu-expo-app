import { StyleSheet, View } from 'react-native';
import { RNHostView } from '@expo/ui';
import {
  FRIENDS_FEED_ROW_GAP,
  FRIENDS_FEED_SECTION_ROW_INSET,
  FriendsFeedThumbnailRow,
} from '@/components/friends/friends-feed-thumbnail-row';
import type { FriendsPostWithImage } from '@/queries/posts';

export type FriendsFeedThumbnailSlotProps = {
  posts: FriendsPostWithImage[];
  screenWidth: number;
  rowHeight: number;
  isLastRow: boolean;
  testID: string;
  testIDPrefix: string;
  onPostPress: (post: FriendsPostWithImage) => void;
};

export function FriendsFeedThumbnailSlot({
  posts,
  screenWidth,
  rowHeight,
  isLastRow,
  testID,
  testIDPrefix,
  onPostPress,
}: FriendsFeedThumbnailSlotProps) {
  const slotHeight = rowHeight + (isLastRow ? 0 : FRIENDS_FEED_ROW_GAP);

  return (
    <RNHostView matchContents>
      <View
        style={[
          styles.slot,
          {
            width: screenWidth,
            height: slotHeight,
            marginHorizontal: -FRIENDS_FEED_SECTION_ROW_INSET,
          },
        ]}
      >
        <FriendsFeedThumbnailRow
          posts={posts}
          screenWidth={screenWidth}
          testID={testID}
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
