import { useCallback, useContext, useState } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { FriendsListTab } from "@/components/friends/friends-list-tab";
import { TabBarContext } from "@/context/tab-bar";

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

export default function FriendsListScreen() {
  const { setIsTabBarHidden } = useContext(TabBarContext);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      setIsTabBarHidden(true);
      return () => setIsTabBarHidden(false);
    }, [setIsTabBarHidden]),
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Friends",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <FriendsListTab query={query} isSearchOpen={isSearchOpen} />
      <FriendsListToolbar
        onQueryChange={setQuery}
        onSearchOpenChange={setIsSearchOpen}
      />
    </>
  );
}
