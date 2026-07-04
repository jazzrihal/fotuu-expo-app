import { AppleMaps, GoogleMaps } from "expo-maps";
import type { AppleMapsViewType } from "expo-maps/build/apple/AppleMaps.types";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export type MapPickerHandle = {
  setCameraPosition: (coords: MapCoordinates, zoom?: number) => void;
};

type MapPickerProps = {
  viewCoordinates: MapCoordinates;
  markerCoordinates: MapCoordinates;
  onCoordinatesChange: (coordinates: MapCoordinates) => void;
  style?: StyleProp<ViewStyle>;
};

export const MapPicker = forwardRef<MapPickerHandle, MapPickerProps>(function MapPicker(
  { viewCoordinates, markerCoordinates, onCoordinatesChange, style },
  ref,
) {
  const { width: windowWidth } = useWindowDimensions();
  const [edgeInset, setEdgeInset] = useState(0);
  const appleMapRef = useRef<AppleMapsViewType>(null);

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

  useImperativeHandle(ref, () => ({
    setCameraPosition(coords: MapCoordinates, zoom = 14) {
      appleMapRef.current?.setCameraPosition({
        coordinates: { latitude: coords.latitude, longitude: coords.longitude },
        zoom,
      });
    },
  }));

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
          ref={appleMapRef}
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
});
