import { StyleSheet, View } from 'react-native';
import { RNHostView } from '@expo/ui';
import { fillMaxWidth, offset } from '@expo/ui/jetpack-compose/modifiers';
import {
  FRIENDS_FEED_ROW_GAP,
  FriendsFeedThumbnailRow,
  getFriendsFeedAndroidListItemOffset,
} from '@/components/friends/friends-feed-thumbnail-row';
import type { FriendsFeedThumbnailSlotProps } from '@/components/friends/friends-feed-thumbnail-slot';

export function FriendsFeedThumbnailSlot({
  posts,
  screenWidth,
  rowHeight,
  isLastRow,
  testID,
  testIDPrefix,
  onPostPress,
}: FriendsFeedThumbnailSlotProps) {
  const bleedOffset = getFriendsFeedAndroidListItemOffset(rowHeight);
  const slotHeight = rowHeight + (isLastRow ? 0 : FRIENDS_FEED_ROW_GAP);

  return (
    <RNHostView
      matchContents
      modifiers={[fillMaxWidth(), offset(bleedOffset.x, bleedOffset.y)]}
    >
      <View style={[styles.slot, { width: screenWidth, height: slotHeight }]}>
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
