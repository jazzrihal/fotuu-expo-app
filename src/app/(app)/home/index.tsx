import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Button, Host, Row, Text } from "@expo/ui";
import { Empty } from "@/components/empty";
import { EmptyActionsSheet } from "@/components/empty-actions-sheet";
import { useObserve } from "@legendapp/state/react";
import { Image } from "@/components/image";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { HomeFeedHeader } from "@/components/home-feed-header";
import { type MapCoordinates } from "@/components/map-picker";
import { locationPicker$ } from "@/lib/location-picker-store";
import { resolveLocationLabel } from "@/lib/location-label";
import { getPostImageUrls, listFeedPosts, type FeedPost } from "@/lib/posts";

type FeedPostWithImage = FeedPost & { imageUrl?: string };

const DEFAULT_COORDINATES: MapCoordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
};

const GRID_COLUMNS = 3;
const GRID_GAP = 1;

export default function Home() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const gridSeparatorColor = colorScheme === "dark" ? "#000" : "#fff";
  const { width: screenWidth } = useWindowDimensions();
  const tileSize = useMemo(
    () =>
      Math.floor(
        (screenWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
      ),
    [screenWidth],
  );

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedLocation, setSelectedLocation] =
    useState<MapCoordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState("Current location");
  const [posts, setPosts] = useState<FeedPostWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initializingLocation, setInitializingLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  useObserve(locationPicker$.confirmed, async ({ value }) => {
    if (!value) {
      return;
    }

    setSelectedLocation(value);
    setLocationLabel(await resolveLocationLabel(value));
    locationPicker$.confirmed.set(null);
  });

  const loadFeed = useCallback(
    async (isRefresh = false) => {
      if (!selectedLocation) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const { data, error: listError } = await listFeedPosts({
          at: selectedDate.toISOString(),
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        });

        if (listError) {
          setError(listError);
          setPosts([]);
          return;
        }

        const feedPosts = data ?? [];
        const paths = feedPosts.map((post) => post.storage_object_path);
        const { data: imageUrls, error: urlError } =
          await getPostImageUrls(paths);

        if (urlError) {
          setError(urlError);
          setPosts([]);
          return;
        }

        setPosts(
          feedPosts.map((post) => ({
            ...post,
            imageUrl: imageUrls[post.storage_object_path],
          })),
        );
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [selectedDate, selectedLocation],
  );

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
            setLoading(false);
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
        setLocationLabel(await resolveLocationLabel(coordinates));
      } catch {
        if (!cancelled) {
          setLocationLabel("Select location");
          setLoading(false);
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

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    void loadFeed();
  }, [loadFeed, selectedLocation]);

  const openLocationPicker = useCallback(() => {
    locationPicker$.initial.set(selectedLocation ?? DEFAULT_COORDINATES);
    router.push("/(app)/home/map-picker-modal");
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
      setLocationLabel(await resolveLocationLabel(coordinates));
      setLocationSheetOpen(false);
    } catch {
      setLocationLabel("Select location");
    }
  }, []);

  const showLocationEmpty =
    !initializingLocation && !loading && !selectedLocation;

  useEffect(() => {
    if (showLocationEmpty) {
      setLocationSheetOpen(true);
    }
  }, [showLocationEmpty]);

  const openPostDetail = useCallback(
    (post: FeedPostWithImage) => {
      router.push({
        pathname: "/(app)/home/[id]",
        params: {
          id: post.id,
          post: JSON.stringify(post),
        },
      });
    },
    [router],
  );

  const renderGridItem = useCallback(
    ({ item, index }: { item: FeedPostWithImage; index: number }) => (
      <Pressable
        testID={`home-feed-post-${item.id}`}
        onPress={() => openPostDetail(item)}
        style={{
          width: tileSize,
          height: tileSize,
          marginRight: index % GRID_COLUMNS < GRID_COLUMNS - 1 ? GRID_GAP : 0,
          marginBottom: GRID_GAP,
        }}
      >
        <Image
          recyclingKey={item.id}
          source={item.imageUrl ? { uri: item.imageUrl } : undefined}
          style={{ width: tileSize, height: tileSize }}
          contentFit="cover"
        />
      </Pressable>
    ),
    [openPostDetail, tileSize],
  );

  const feedContent = (() => {
    if (initializingLocation || loading) {
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
      <FlashList
        testID="home-feed-grid"
        data={posts}
        numColumns={GRID_COLUMNS}
        keyExtractor={(item) => item.id}
        renderItem={renderGridItem}
        style={{ backgroundColor: gridSeparatorColor }}
        refreshing={refreshing}
        onRefresh={() => {
          void loadFeed(true);
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
          accessibilityLabel="New post"
          icon="plus"
          onPress={() => router.push("/(app)/home/new-post")}
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
