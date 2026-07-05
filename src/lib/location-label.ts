import * as Location from 'expo-location';

import type { MapCoordinates } from '@/components/map-picker';
import type { PostLocationParts } from '@/lib/post-display';

export async function resolvePostLocationParts(
  coordinates: MapCoordinates,
): Promise<PostLocationParts> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coordinates);
    if (!place) {
      return {};
    }

    return {
      address: place.street ?? place.name ?? null,
      city: place.city ?? null,
      region: place.region ?? null,
      country: place.country ?? null,
    };
  } catch {
    return {};
  }
}

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
