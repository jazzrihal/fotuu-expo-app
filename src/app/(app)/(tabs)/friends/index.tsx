import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { Stack } from 'expo-router';
import { Empty } from '@/components/empty';
import { FriendsFeedTab } from '@/components/friends/friends-feed-tab';
import { FriendsListTab } from '@/components/friends/friends-list-tab';

const SEGMENTS = ['Chats', 'Feed', 'Friends'] as const;
const DEFAULT_SEGMENT_INDEX = 2;

export default function FriendsScreen() {
  const [segmentIndex, setSegmentIndex] = useState(DEFAULT_SEGMENT_INDEX);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <Stack.Screen options={{ title: 'Friends' }} />
      <View style={styles.container}>
        <View style={styles.segmentRow}>
          <SegmentedControl
            testID="friends-segments"
            values={[...SEGMENTS]}
            selectedIndex={segmentIndex}
            onChange={(event) => {
              setSegmentIndex(event.nativeEvent.selectedSegmentIndex);
              setIsSearchOpen(false);
            }}
          />
        </View>
        {segmentIndex === 0 ? (
          <Empty testID="friends-chats-empty" title="Coming soon" />
        ) : segmentIndex === 1 ? (
          <FriendsFeedTab />
        ) : (
          <FriendsListTab
            isSearchOpen={isSearchOpen}
            onSearchOpenChange={setIsSearchOpen}
          />
        )}
      </View>
      {segmentIndex === 2 ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Search"
            hidden={isSearchOpen}
            icon="magnifyingglass"
            onPress={() => setIsSearchOpen(true)}
          />
        </Stack.Toolbar>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
