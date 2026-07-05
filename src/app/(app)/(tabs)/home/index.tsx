import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { Button, Host, Row, Text } from "@expo/ui";
import { Empty } from "@/components/empty";
import { EmptyActionsSheet } from "@/components/empty-actions-sheet";
import { PostFeedGrid } from "@/components/post-feed-grid";
import { useObserve } from "@legendapp/state/react";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { HomeFeedHeader } from "@/components/home-feed-header";
import { type MapCoordinates } from "@/components/map-picker";
import { locationPicker$ } from "@/lib/location-picker-store";
import {
  formatLocationButtonLabel,
  resolvePostLocationParts,
} from "@/lib/location-label";
import {
  momentPicker$,
} from "@/lib/moment-picker-store";
import type { PostLocationParts } from "@/lib/post-display";
import { openPostDetail } from "@/lib/navigation";
import { useFeedQuery, type FeedPostWithImage } from "@/queries/posts";

const DEFAULT_COORDINATES: MapCoordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export default function Home() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedLocation, setSelectedLocation] =
    useState<MapCoordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState("Current location");
  const [locationParts, setLocationParts] = useState<PostLocationParts>({});
  const [initializingLocation, setInitializingLocation] = useState(true);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  const hasLocation =
    selectedLocation != null &&
    Number.isFinite(selectedLocation.latitude) &&
    Number.isFinite(selectedLocation.longitude);

  const feedQuery = useFeedQuery({
    at: selectedDate.toISOString(),
    latitude: selectedLocation?.latitude ?? NaN,
    longitude: selectedLocation?.longitude ?? NaN,
  });

  const posts = feedQuery.data ?? [];
  const gridPosts = useMemo(
    () =>
      (feedQuery.data ?? []).map((post) => ({
        ...post,
        isPinned: post.is_pinned_by_current_user,
      })),
    [feedQuery.data],
  );
  const showFeedLoading =
    initializingLocation || (hasLocation && feedQuery.isPending);
  const error = feedQuery.error?.message ?? null;

  useObserve(locationPicker$.confirmed, async ({ value }) => {
    if (!value) {
      return;
    }

    const parts = await resolvePostLocationParts(value);
    setSelectedLocation(value);
    setLocationParts(parts);
    setLocationLabel(formatLocationButtonLabel(parts));
    locationPicker$.confirmed.set(null);
  });

  useObserve(momentPicker$.applied, ({ value }) => {
    if (!value) {
      return;
    }

    setSelectedDate(new Date(value.occurredAt));
    setSelectedLocation({
      latitude: value.latitude,
      longitude: value.longitude,
    });
    setLocationParts({
      address: value.address || null,
      city: value.city || null,
      region: value.region || null,
      country: value.country || null,
    });
    setLocationLabel(
      formatLocationButtonLabel({
        city: value.city || null,
        region: value.region || null,
        country: value.country || null,
      }),
    );
    momentPicker$.applied.set(null);
  });

  useEffect(() => {
    let cancelled = false;

    async function initializeLocation() {
      setInitializingLocation(true);

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (!cancelled) {
            setLocationLabel("Select location");
            setInitializingLocation(false);
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        if (cancelled) {
          return;
        }

        setSelectedLocation(coordinates);
        const parts = await resolvePostLocationParts(coordinates);
        setLocationParts(parts);
        setLocationLabel(formatLocationButtonLabel(parts));
      } catch {
        if (!cancelled) {
          setLocationLabel("Select location");
        }
      } finally {
        if (!cancelled) {
          setInitializingLocation(false);
        }
      }
    }

    void initializeLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  const openLocationPicker = useCallback(() => {
    locationPicker$.initial.set(selectedLocation ?? DEFAULT_COORDINATES);
    router.push("/(app)/(tabs)/home/map-picker-modal");
  }, [selectedLocation, router]);

  const acceptLocation = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setSelectedLocation(coordinates);
      const parts = await resolvePostLocationParts(coordinates);
      setLocationParts(parts);
      setLocationLabel(formatLocationButtonLabel(parts));
      setLocationSheetOpen(false);
    } catch {
      setLocationLabel("Select location");
    }
  }, []);

  const openMoments = useCallback(() => {
    momentPicker$.draft.set(
      hasLocation
        ? {
            occurredAt: selectedDate.toISOString(),
            latitude: selectedLocation!.latitude,
            longitude: selectedLocation!.longitude,
            ...locationParts,
          }
        : {
            occurredAt: selectedDate.toISOString(),
            latitude: NaN,
            longitude: NaN,
          },
    );
    router.push("/(app)/(tabs)/home/moments");
  }, [hasLocation, locationParts, router, selectedDate, selectedLocation]);

  const showLocationEmpty =
    !initializingLocation && !showFeedLoading && !selectedLocation;

  useEffect(() => {
    if (showLocationEmpty) {
      setLocationSheetOpen(true);
    }
  }, [showLocationEmpty]);

  const handleOpenPostDetail = useCallback(
    (post: FeedPostWithImage) => {
      if (!selectedLocation) {
        return;
      }
      openPostDetail(router, post, {
        testIDPrefix: "home-post",
        feedSource: {
          type: "home",
          at: selectedDate.toISOString(),
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
      });
    },
    [router, selectedDate, selectedLocation],
  );

  const feedContent = (() => {
    if (showFeedLoading) {
      return <ActivityIndicator style={styles.loader} />;
    }

    if (!selectedLocation) {
      return (
        <Empty
          testID="home-feed-location-required"
          title="Location required"
          description="Allow location access or choose a place on the map."
        />
      );
    }

    if (error) {
      return (
        <Host matchContents style={styles.feedMessage}>
          <Text testID="home-feed-error">{error}</Text>
        </Host>
      );
    }

    if (posts.length === 0) {
      return (
        <Empty
          testID="home-feed-empty"
          title="No posts nearby"
          description="Try another date or location."
        />
      );
    }

    return (
      <PostFeedGrid
        testID="home-feed-grid"
        testIDPrefix="home-feed"
        posts={gridPosts}
        onPostPress={handleOpenPostDetail}
        refreshing={feedQuery.isRefetching && !feedQuery.isPending}
        onRefresh={() => {
          void feedQuery.refetch();
        }}
      />
    );
  })();

  return (
    <>
      <HomeFeedHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        locationLabel={locationLabel}
        onLocationPress={openLocationPicker}
      />
      <View testID="home-feed" style={styles.feed}>
        {feedContent}
      </View>

      {showLocationEmpty ? (
        <EmptyActionsSheet
          isPresented={locationSheetOpen}
          onDismiss={() => setLocationSheetOpen(false)}
          testID="home-feed-location-actions"
        >
          <Text textStyle={{ textAlign: "center" }}>
            Grant access to your location?
          </Text>
          <Row spacing={12} alignment="center">
            <Button
              testID="home-feed-accept-location"
              variant="filled"
              label="Accept"
              onPress={() => {
                void acceptLocation();
              }}
            />
            <Button
              variant="outlined"
              label="Reject"
              onPress={() => setLocationSheetOpen(false)}
            />
          </Row>
        </EmptyActionsSheet>
      ) : null}

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Saved moments"
          icon="bookmark"
          onPress={openMoments}
        />
        <Stack.Toolbar.Button
          accessibilityLabel="New post"
          icon="plus"
          onPress={() => router.push("/(app)/(tabs)/home/new-post")}
        />
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  feed: {
    flex: 1,
  },
  feedMessage: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  loader: {
    marginTop: 32,
  },
});
