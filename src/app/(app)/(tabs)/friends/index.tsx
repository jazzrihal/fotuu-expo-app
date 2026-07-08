import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { Stack } from "expo-router";
import { FriendsFeedTab } from "@/components/friends/friends-feed-tab";
import { FriendsListTab } from "@/components/friends/friends-list-tab";

const SEGMENTS = ["Feed", "Friends"] as const;
const DEFAULT_SEGMENT_INDEX = 0;

function FriendsListToolbar({
  onQueryChange,
  onSearchOpenChange,
}: {
  onQueryChange: (text: string) => void;
  onSearchOpenChange: (open: boolean) => void;
}) {
  function closeSearch() {
    onQueryChange("");
    onSearchOpenChange(false);
  }

  return (
    <>
      <Stack.SearchBar
        placeholder="Search by username or name"
        autoCapitalize="none"
        placement="integratedButton"
        allowToolbarIntegration
        hideWhenScrolling={false}
        hideNavigationBar
        onChangeText={(e) => onQueryChange(e.nativeEvent.text)}
        onFocus={() => onSearchOpenChange(true)}
        onBlur={() => onSearchOpenChange(false)}
        onCancelButtonPress={closeSearch}
      />
      <Stack.Toolbar>
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
    </>
  );
}

export default function FriendsScreen() {
  const [segmentIndex, setSegmentIndex] = useState(DEFAULT_SEGMENT_INDEX);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

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
              setQuery("");
              setIsSearchOpen(false);
            }}
          />
        </View>
        <View style={styles.content}>
          {segmentIndex === 0 ? (
            <FriendsFeedTab />
          ) : (
            <FriendsListTab query={query} isSearchOpen={isSearchOpen} />
          )}
        </View>
      </View>
      {segmentIndex === 1 ? (
        <FriendsListToolbar
          onQueryChange={setQuery}
          onSearchOpenChange={setIsSearchOpen}
        />
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
