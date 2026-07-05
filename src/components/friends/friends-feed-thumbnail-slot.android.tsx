import { StyleSheet, View } from 'react-native';
import { RNHostView } from '@expo/ui';
import { fillMaxWidth, offset } from '@expo/ui/jetpack-compose/modifiers';
import {
  FriendsFeedThumbnailRow,
  getFriendsFeedAndroidListItemOffset,
} from '@/components/friends/friends-feed-thumbnail-row';
import type { FriendsFeedThumbnailSlotProps } from '@/components/friends/friends-feed-thumbnail-slot';

export function FriendsFeedThumbnailSlot({
  posts,
  screenWidth,
  rowHeight,
  testIDPrefix,
  onPostPress,
}: FriendsFeedThumbnailSlotProps) {
  const bleedOffset = getFriendsFeedAndroidListItemOffset(rowHeight);

  return (
    <RNHostView
      matchContents
      modifiers={[fillMaxWidth(), offset(bleedOffset.x, bleedOffset.y)]}
    >
      <View style={[styles.slot, { width: screenWidth, height: rowHeight }]}>
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
