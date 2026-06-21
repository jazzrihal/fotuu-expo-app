import * as Location from 'expo-location';

import type { MapCoordinates } from '@/components/map-picker';

export async function resolveLocationLabel(coordinates: MapCoordinates): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coordinates);
    if (!place) {
      return 'Selected location';
    }

    return place.city ?? place.region ?? place.country ?? 'Selected location';
  } catch {
    return 'Selected location';
  }
}
