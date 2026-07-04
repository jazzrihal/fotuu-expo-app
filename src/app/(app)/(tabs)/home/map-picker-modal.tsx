import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
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

export default function MapPickerModal() {
  const router = useRouter();
  const mapRef = useRef<MapPickerHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initial = locationPicker$.initial.get() ?? DEFAULT_COORDINATES;
  const [draftLocation, setDraftLocation] = useState<MapCoordinates>(initial);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  function confirmLocation() {
    locationPicker$.confirmed.set(draftLocation);
    router.back();
  }

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      setSuggestions([]);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!text.trim()) {
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await getCompletions(text, {
            latitude: draftLocation.latitude,
            longitude: draftLocation.longitude,
          });
          setSuggestions(results);
        } catch {
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [draftLocation],
  );

  const handleSuggestionPress = useCallback(
    async (suggestion: SearchSuggestion) => {
      setSearchQuery(suggestion.title);
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
    setSearchQuery("");
    setSuggestions([]);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const showSuggestions = suggestions.length > 0;

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

        {Platform.OS === "ios" && (
          <View style={styles.searchContainer} pointerEvents="box-none">
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Search for a place or address"
                placeholderTextColor="#8e8e93"
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
              {isSearching && (
                <ActivityIndicator size="small" color="#8e8e93" style={styles.spinner} />
              )}
            </View>

            {showSuggestions && (
              <FlatList
                style={styles.suggestionsList}
                data={suggestions}
                keyExtractor={(item, index) => `${item.title}-${index}`}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item, index }) => (
                  <Pressable
                    style={({ pressed }) => [
                      styles.suggestionItem,
                      index === suggestions.length - 1 && styles.suggestionItemLast,
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
            )}
          </View>
        )}
      </View>

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
  searchContainer: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    padding: 0,
  },
  spinner: {
    marginLeft: 8,
  },
  suggestionsList: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
