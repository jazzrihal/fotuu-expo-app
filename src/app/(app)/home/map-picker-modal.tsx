import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { MapPicker, type MapCoordinates } from "@/components/map-picker";
import { locationPicker$ } from "@/lib/location-picker-store";

const DEFAULT_COORDINATES: MapCoordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export default function MapPickerModal() {
  const router = useRouter();
  const initial = locationPicker$.initial.get() ?? DEFAULT_COORDINATES;
  const [viewLocation] = useState<MapCoordinates>(initial);
  const [draftLocation, setDraftLocation] = useState<MapCoordinates>(initial);

  function confirmLocation() {
    locationPicker$.confirmed.set(draftLocation);
    router.back();
  }

  return (
    <>
      <View style={styles.screen}>
        <MapPicker
          style={styles.map}
          viewCoordinates={viewLocation}
          markerCoordinates={draftLocation}
          onCoordinatesChange={setDraftLocation}
        />
      </View>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          testID="home-feed-map-picker-cancel"
          accessibilityLabel="Cancel"
          onPress={() => router.back()}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          testID="home-feed-confirm-location"
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
});
