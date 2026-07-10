import { StyleSheet, View } from 'react-native';
import { Group, RNHostView } from '@expo/ui/swift-ui';
import { listRowInsets, listRowSeparator } from '@expo/ui/swift-ui/modifiers';
import {
  FRIENDS_FEED_ROW_GAP,
  FRIENDS_FEED_IOS_LIST_ROW_BLEED,
  FriendsFeedThumbnailRow,
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
  const { horizontal } = FRIENDS_FEED_IOS_LIST_ROW_BLEED;
  const slotHeight = rowHeight + (isLastRow ? 0 : FRIENDS_FEED_ROW_GAP);

  return (
    <Group
      modifiers={[
        listRowInsets({
          top: 0,
          bottom: 0,
          leading: -horizontal,
          trailing: -horizontal,
        }),
        listRowSeparator('hidden'),
      ]}
    >
      <RNHostView matchContents>
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
    </Group>
  );
}

const styles = StyleSheet.create({
  slot: {
    overflow: 'hidden',
  },
});
