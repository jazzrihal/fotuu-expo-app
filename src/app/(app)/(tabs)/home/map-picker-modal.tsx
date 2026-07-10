import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SearchBarCommands } from "react-native-screens";
import { MapPicker, type MapCoordinates, type MapPickerHandle } from "@/components/map-picker";
import { locationPicker$ } from "@/lib/location-picker-store";
import {
  getCompletions,
  resolveCompletion,
  type SearchSuggestion,
} from "../../../../../modules/location-search/src";

const DEFAULT_COORDINATES: MapCoordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
};

const SEARCH_BAR_HEIGHT = 52;
const SUGGESTIONS_GAP = 8;
const SEARCH_RESULTS_SPACING = 10;

export default function MapPickerModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapPickerHandle>(null);
  const searchBarRef = useRef<SearchBarCommands>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);

  const initial = locationPicker$.initial.get() ?? DEFAULT_COORDINATES;
  const [draftLocation, setDraftLocation] = useState<MapCoordinates>(initial);

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useKeyboardHandler(
    {
      onMove: (e) => {
        "worklet";
        runOnJS(setKeyboardHeight)(e.height);
      },
      onEnd: (e) => {
        "worklet";
        runOnJS(setKeyboardHeight)(e.height);
      },
    },
    [],
  );

  const suggestionsBottom =
    keyboardHeight > 0
      ? keyboardHeight + SEARCH_BAR_HEIGHT + SUGGESTIONS_GAP
      : insets.bottom + SEARCH_BAR_HEIGHT + SUGGESTIONS_GAP;

  function confirmLocation() {
    locationPicker$.confirmed.set(draftLocation);
    router.back();
  }

  const handleSearchChange = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!text.trim()) {
        searchRequestRef.current += 1;
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        const requestId = ++searchRequestRef.current;
        try {
          const results = await getCompletions(text, {
            latitude: draftLocation.latitude,
            longitude: draftLocation.longitude,
          });
          if (requestId === searchRequestRef.current) {
            setSuggestions(results);
          }
        } catch {
          if (requestId === searchRequestRef.current) {
            setSuggestions([]);
          }
        } finally {
          if (requestId === searchRequestRef.current) {
            setIsSearching(false);
          }
        }
      }, 300);
    },
    [draftLocation],
  );

  const handleSuggestionPress = useCallback(
    async (suggestion: SearchSuggestion) => {
      searchBarRef.current?.cancelSearch();
      setSuggestions([]);
      setIsSearching(true);

      try {
        const resolved = await resolveCompletion(suggestion, {
          latitude: draftLocation.latitude,
          longitude: draftLocation.longitude,
        });
        const coords = { latitude: resolved.latitude, longitude: resolved.longitude };
        setDraftLocation(coords);
        mapRef.current?.setCameraPosition(coords);
      } catch {
        // leave current location unchanged
      } finally {
        setIsSearching(false);
      }
    },
    [draftLocation],
  );

  const clearSearch = useCallback(() => {
    searchRequestRef.current += 1;
    setSuggestions([]);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const showSuggestionsPanel = suggestions.length > 0 || isSearching;

  return (
    <>
      <View style={styles.screen}>
        <MapPicker
          ref={mapRef}
          style={styles.map}
          viewCoordinates={initial}
          markerCoordinates={draftLocation}
          onCoordinatesChange={setDraftLocation}
        />

        {showSuggestionsPanel && (
          <View
            style={[styles.suggestionsContainer, { bottom: suggestionsBottom }]}
            pointerEvents="box-none"
          >
            <FlatList
              style={styles.suggestionsList}
              data={suggestions}
              inverted
              keyExtractor={(item, index) => `${item.title}-${index}`}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                isSearching ? (
                  <View style={styles.searchingRow}>
                    <ActivityIndicator size="small" color="#8e8e93" />
                  </View>
                ) : null
              }
              renderItem={({ item, index }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    index === 0 && styles.suggestionItemLast,
                    pressed && styles.suggestionItemPressed,
                  ]}
                  onPress={() => handleSuggestionPress(item)}
                >
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        )}
      </View>

      <Stack.SearchBar
        ref={searchBarRef}
        placeholder="Search for a place or address"
        autoCapitalize="none"
        placement="integratedButton"
        allowToolbarIntegration
        hideNavigationBar={false}
        hideWhenScrolling={false}
        onChangeText={(e) => handleSearchChange(e.nativeEvent.text)}
        onCancelButtonPress={clearSearch}
      />
      <Stack.Toolbar>
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Cancel"
          onPress={() => {
            clearSearch();
            router.back();
          }}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Confirm"
          variant="done"
          onPress={confirmLocation}
        >
          Confirm
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  suggestionsContainer: {
    position: "absolute",
    left: 12,
    right: 12,
  },
  suggestionsList: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 12,
    marginBottom: SEARCH_RESULTS_SPACING,
    maxHeight: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchingRow: {
    alignItems: "center",
    paddingVertical: 12,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionItemPressed: {
    backgroundColor: "#f2f2f7",
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  suggestionSubtitle: {
    fontSize: 13,
    color: "#6d6d72",
    marginTop: 2,
  },
});
