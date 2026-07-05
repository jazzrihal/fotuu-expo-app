import { StyleSheet, View } from 'react-native';
import { Group, RNHostView } from '@expo/ui/swift-ui';
import { listRowInsets, listRowSeparator } from '@expo/ui/swift-ui/modifiers';
import {
  FRIENDS_FEED_IOS_LIST_ROW_BLEED,
  FriendsFeedThumbnailRow,
} from '@/components/friends/friends-feed-thumbnail-row';
import type { FriendsFeedThumbnailSlotProps } from '@/components/friends/friends-feed-thumbnail-slot';

export function FriendsFeedThumbnailSlot({
  posts,
  screenWidth,
  rowHeight,
  testIDPrefix,
  onPostPress,
}: FriendsFeedThumbnailSlotProps) {
  const { horizontal, vertical } = FRIENDS_FEED_IOS_LIST_ROW_BLEED;

  return (
    <Group
      modifiers={[
        listRowInsets({
          top: -vertical,
          bottom: -vertical,
          leading: -horizontal,
          trailing: -horizontal,
        }),
        listRowSeparator('hidden'),
      ]}
    >
      <RNHostView matchContents>
        <View style={[styles.slot, { width: screenWidth, height: rowHeight }]}>
          <FriendsFeedThumbnailRow
            posts={posts}
            screenWidth={screenWidth}
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
