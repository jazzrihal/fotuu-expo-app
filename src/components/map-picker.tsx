import { AppleMaps, GoogleMaps } from "expo-maps";
import { useState } from "react";
import { Platform, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

type MapPickerProps = {
  viewCoordinates: MapCoordinates;
  markerCoordinates: MapCoordinates;
  onCoordinatesChange: (coordinates: MapCoordinates) => void;
  style?: StyleProp<ViewStyle>;
};

export function MapPicker({
  viewCoordinates,
  markerCoordinates,
  onCoordinatesChange,
  style,
}: MapPickerProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [edgeInset, setEdgeInset] = useState(0);
  const cameraPosition = {
    coordinates: {
      latitude: viewCoordinates.latitude,
      longitude: viewCoordinates.longitude,
    },
    zoom: 14,
  };

  const markers = [
    {
      id: "selected",
      coordinates: {
        latitude: markerCoordinates.latitude,
        longitude: markerCoordinates.longitude,
      },
    },
  ];

  if (Platform.OS === "ios") {
    return (
      <View
        style={{ flex: 1, overflow: "visible" }}
        onLayout={(e) => {
          const measured = (windowWidth - e.nativeEvent.layout.width) / 2;
          if (Math.abs(measured - edgeInset) > 0.5) setEdgeInset(measured);
        }}
      >
        <AppleMaps.View
          style={[{ flex: 1, marginHorizontal: edgeInset > 0 ? -edgeInset : 0 }, style]}
          cameraPosition={cameraPosition}
          markers={markers}
          onMapClick={(event) => {
            const { latitude, longitude } = event.coordinates;
            if (latitude !== undefined && longitude !== undefined) {
              onCoordinatesChange({ latitude, longitude });
            }
          }}
        />
      </View>
    );
  }

  if (Platform.OS === "android") {
    return (
      <GoogleMaps.View
        style={[{ flex: 1 }, style]}
        cameraPosition={cameraPosition}
        markers={markers}
        onMapClick={(event) => {
          const { latitude, longitude } = event.coordinates;
          if (latitude !== undefined && longitude !== undefined) {
            onCoordinatesChange({ latitude, longitude });
          }
        }}
      />
    );
  }

  return null;
}
