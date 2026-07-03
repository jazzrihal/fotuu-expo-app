import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { Stack } from "expo-router";
import { FriendsFeedTab } from "@/components/friends/friends-feed-tab";
import { FriendsListTab } from "@/components/friends/friends-list-tab";

const SEGMENTS = ["Feed", "Friends"] as const;
const DEFAULT_SEGMENT_INDEX = 0;

export default function FriendsScreen() {
  const [segmentIndex, setSegmentIndex] = useState(DEFAULT_SEGMENT_INDEX);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <Stack.Screen options={{ title: "Friends" }} />
      <View style={styles.container}>
        <View style={styles.segmentRow}>
          <SegmentedControl
            testID="friends-segments"
            style={styles.segmentedControl}
            values={[...SEGMENTS]}
            selectedIndex={segmentIndex}
            onChange={(event) => {
              setSegmentIndex(event.nativeEvent.selectedSegmentIndex);
              setIsSearchOpen(false);
            }}
          />
        </View>
        <View style={styles.content}>
          {segmentIndex === 0 ? (
            <FriendsFeedTab />
          ) : (
            <FriendsListTab
              isSearchOpen={isSearchOpen}
              onSearchOpenChange={setIsSearchOpen}
            />
          )}
        </View>
      </View>
      {segmentIndex === 1 ? (
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentedControl: {
    width: "100%",
  },
  content: {
    flex: 1,
  },
});
