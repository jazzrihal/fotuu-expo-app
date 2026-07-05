import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Button,
  Column,
  Host,
  Icon,
  Picker,
  Row,
  RNHostView,
  ScrollView,
  Text as UiText,
  TextInput,
} from "@expo/ui";
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type FocusMode,
} from "expo-camera";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Empty } from "@/components/empty";
import { EmptyActionsSheet } from "@/components/empty-actions-sheet";
import { Image } from "@/components/image";
import * as Location from "expo-location";
import { Stack, useRouter, useTheme } from "expo-router";
import { useAuth } from "@/context/auth";
import { resolvePostLocationParts } from "@/lib/location-label";
import { buildLocationLine, formatCapturedAt } from "@/lib/post-display";
import { type PostPrivacyScope } from "@/lib/posts";
import { profileDisplayName } from "@/lib/profile-display";
import { saveLocalPost, queuePostForUpload } from "@/lib/post-manager";
import { runSync } from "@/lib/sync-manager";
import { useCreatePostMutation } from "@/queries/posts";
import { useUserProfileQuery } from "@/queries/profile";

const CAPTION_MAX_LENGTH = 500;

function formatZoomLabel(zoom: number): string {
  return `${(1 + zoom * 9).toFixed(1)}x`;
}

export default function NewPostScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const { colors, dark } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const shutterRingColor = dark
    ? "rgba(255, 255, 255, 0.3)"
    : "rgba(0, 0, 0, 0.12)";
  const [permission, requestPermission] = useCameraPermissions();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [locationLine, setLocationLine] = useState<string | null>(null);
  const [locationParts, setLocationParts] = useState<{ address?: string | null; city?: string | null; region?: string | null }>({});
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [caption, setCaption] = useState("");
  const [privacyScope, setPrivacyScope] =
    useState<PostPrivacyScope>("friends_only");
  const [capturing, setCapturing] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraSheetOpen, setCameraSheetOpen] = useState(true);
  const [zoom, setZoom] = useState(0);
  const [facing, setFacing] = useState<CameraType>("back");
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [autofocusMode, setAutofocusMode] = useState<FocusMode>("off");
  const [focusSquare, setFocusSquare] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);

  const zoomRef = useRef(zoom);
  const pinchStartZoom = useRef(0);
  const zoomIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autofocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const profileQuery = useUserProfileQuery(session?.user.id, {
    enabled: !!session?.user.id && !!imageUri,
  });

  const createPostMutation = useCreatePostMutation();

  const displayName = profileDisplayName(
    profileQuery.data,
    session?.user.email,
  );

  useEffect(() => {
    return () => {
      if (zoomIndicatorTimeoutRef.current) {
        clearTimeout(zoomIndicatorTimeoutRef.current);
      }
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      if (autofocusTimeoutRef.current) {
        clearTimeout(autofocusTimeoutRef.current);
      }
    };
  }, []);

  const handlePinchBegin = useCallback(() => {
    pinchStartZoom.current = zoomRef.current;
    setShowZoomIndicator(true);
    if (zoomIndicatorTimeoutRef.current) {
      clearTimeout(zoomIndicatorTimeoutRef.current);
    }
  }, []);

  const handlePinchUpdate = useCallback((scale: number) => {
    const logScale = Math.log2(scale);
    const next = Math.min(
      1,
      Math.max(0, pinchStartZoom.current + logScale * 0.35),
    );
    setZoom(next);
  }, []);

  const handlePinchEnd = useCallback(() => {
    zoomIndicatorTimeoutRef.current = setTimeout(() => {
      setShowZoomIndicator(false);
    }, 1000);
  }, []);

  const handleTapFocus = useCallback((x: number, y: number) => {
    setFocusSquare({ visible: true, x, y });
    setAutofocusMode("on");
    if (autofocusTimeoutRef.current) {
      clearTimeout(autofocusTimeoutRef.current);
    }
    autofocusTimeoutRef.current = setTimeout(() => {
      setAutofocusMode("off");
    }, 100);
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      setFocusSquare((current) => ({ ...current, visible: false }));
    }, 800);
  }, []);

  /* eslint-disable react-hooks/refs -- RNGH handlers read refs only when gestures fire */
  const cameraGesture = useMemo(() => {
    const pinchGesture = Gesture.Pinch()
      .onBegin(handlePinchBegin)
      .onUpdate((event) => {
        handlePinchUpdate(event.scale);
      })
      .onEnd(handlePinchEnd)
      .runOnJS(true);

    const tapGesture = Gesture.Tap()
      .onEnd((event) => {
        handleTapFocus(event.x, event.y);
      })
      .runOnJS(true);

    return Gesture.Race(tapGesture, pinchGesture);
  }, [handlePinchBegin, handlePinchEnd, handlePinchUpdate, handleTapFocus]);
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (!imageUri || !gpsEnabled) {
      return;
    }

    let cancelled = false;

    async function resolveLocation() {
      setResolvingLocation(true);
      setLocationLine(null);
      setLatitude(undefined);
      setLongitude(undefined);
      setLocationParts({});

      try {
        const locationPermission =
          await Location.requestForegroundPermissionsAsync();
        if (!locationPermission.granted) {
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) {
          return;
        }

        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);

        const parts = await resolvePostLocationParts(coords);
        if (!cancelled) {
          const line = buildLocationLine(parts);
          setLocationLine(line || null);
          setLocationParts(parts);
        }
      } catch {
        // Location is optional; continue without coordinates.
      } finally {
        if (!cancelled) {
          setResolvingLocation(false);
        }
      }
    }

    void resolveLocation();

    return () => {
      cancelled = true;
    };
  }, [imageUri, gpsEnabled]);

  function handleFlipCamera() {
    if (capturing) {
      return;
    }

    setFacing((current) => (current === "back" ? "front" : "back"));
    setZoom(0);
  }

  async function handleShutter() {
    if (capturing || !cameraRef.current) {
      return;
    }

    setCapturing(true);
    setError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });

      if (!photo?.uri) {
        setError("Failed to capture photo. Please try again.");
        return;
      }

      setCapturedAt(new Date());
      setImageUri(photo.uri);
    } catch {
      setError("Failed to capture photo. Please try again.");
    } finally {
      setCapturing(false);
    }
  }

  async function handleSaveForLater() {
    if (!imageUri || !session?.user.id || !capturedAt) return;
    setError(null);
    const result = await saveLocalPost({
      userId: session.user.id,
      localImageUri: imageUri,
      capturedAt: capturedAt.toISOString(),
      caption,
      privacyScope,
      latitude,
      longitude,
      displayName,
      ...locationParts,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setSavedLocally(true);
      router.back();
    }
  }

  function handleSubmit() {
    if (!imageUri || !session?.user.id || !capturedAt || createPostMutation.isPending) {
      return;
    }

    setError(null);

    createPostMutation.mutate(
      {
        localImageUri: imageUri,
        userId: session.user.id,
        capturedAt: capturedAt.toISOString(),
        caption,
        privacyScope,
        latitude,
        longitude,
      },
      {
        onSuccess: () => router.back(),
        onError: async () => {
          // Network/upload failed — save locally and queue for later sync
          const saveResult = await saveLocalPost({
            userId: session!.user.id,
            localImageUri: imageUri!,
            capturedAt: capturedAt!.toISOString(),
            caption,
            privacyScope,
            latitude,
            longitude,
            displayName,
            ...locationParts,
          });
          if (!saveResult.error && saveResult.localPost) {
            await queuePostForUpload(saveResult.localPost.id);
            void runSync();
            setSavedLocally(true);
            router.back();
          } else {
            setError('Failed to post. Please try again.');
          }
        },
      },
    );
  }

  const submitting = createPostMutation.isPending;
  const submitError =
    savedLocally ? null : error ?? profileQuery.error?.message ?? createPostMutation.error?.message ?? null;

  if (!imageUri) {
    if (!permission) {
      return (
        <Host
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" />
        </Host>
      );
    }

    if (!permission.granted) {
      return (
        <>
          <Empty
            testID="new-post-camera-permission-required"
            title="Camera access required"
            description="Allow camera access to take a photo for your post."
          />
          <EmptyActionsSheet
            isPresented={cameraSheetOpen}
            onDismiss={() => setCameraSheetOpen(false)}
            testID="new-post-camera-permission-actions"
          >
            <UiText textStyle={{ textAlign: "center" }}>
              Grant access to the camera?
            </UiText>
            {submitError ? (
              <UiText
                testID="new-post-error"
                textStyle={{ textAlign: "center" }}
              >
                {submitError}
              </UiText>
            ) : null}
            <Row spacing={12} alignment="center">
              <Button
                testID="new-post-request-camera-permission"
                variant="filled"
                label="Accept"
                onPress={() => {
                  void requestPermission();
                }}
              />
              <Button
                variant="outlined"
                label="Reject"
                onPress={() => router.back()}
              />
            </Row>
          </EmptyActionsSheet>
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              onPress={() => router.back()}
            >
              Back
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        </>
      );
    }

    return (
      <>
        <View style={styles.cameraScreen}>
          <GestureDetector gesture={cameraGesture}>
            <View style={styles.cameraPreview}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                zoom={zoom}
                autofocus={autofocusMode}
              />
              {focusSquare.visible ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.focusSquare,
                    {
                      top: focusSquare.y - 30,
                      left: focusSquare.x - 30,
                    },
                  ]}
                />
              ) : null}
              {showZoomIndicator ? (
                <View pointerEvents="none" style={styles.zoomIndicator}>
                  <Text style={styles.zoomIndicatorText}>
                    {formatZoomLabel(zoom)}
                  </Text>
                </View>
              ) : null}
            </View>
          </GestureDetector>
          <View
            style={[styles.controls, { backgroundColor: colors.background }]}
          >
            {submitError ? (
              <Host matchContents>
                <UiText
                  testID="new-post-error"
                  textStyle={{
                    color: colors.text as string,
                    textAlign: "center",
                  }}
                >
                  {submitError}
                </UiText>
              </Host>
            ) : null}
            <View style={styles.controlsRow}>
              <View style={styles.controlButton}>
                <Host matchContents>
                  <Button
                    testID="camera-gps-toggle"
                    variant="text"
                    disabled={capturing}
                    onPress={() => {
                      setGpsEnabled((current) => !current);
                    }}
                  >
                    <Icon
                      name={gpsEnabled ? "location.fill" : "location.slash"}
                      size={22}
                      color={gpsEnabled ? "#0A84FF" : "#FFFFFF"}
                      accessibilityLabel={
                        gpsEnabled
                          ? "Disable location for post"
                          : "Enable location for post"
                      }
                    />
                  </Button>
                </Host>
              </View>
              <TouchableOpacity
                testID="camera-shutter-button"
                accessibilityLabel="Take photo"
                style={[
                  styles.shutterButton,
                  {
                    borderColor: colors.text,
                    backgroundColor: shutterRingColor,
                  },
                ]}
                disabled={capturing}
                onPress={() => {
                  void handleShutter();
                }}
              >
                {capturing ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <View
                    style={[
                      styles.shutterInner,
                      { backgroundColor: colors.text },
                    ]}
                  />
                )}
              </TouchableOpacity>
              <View style={styles.controlButton}>
                <Host matchContents>
                  <Button
                    testID="camera-flip-button"
                    variant="text"
                    disabled={capturing}
                    onPress={handleFlipCamera}
                  >
                    <Icon
                      name="camera.rotate"
                      size={22}
                      color="#FFFFFF"
                      accessibilityLabel="Flip camera"
                    />
                  </Button>
                </Host>
              </View>
            </View>
          </View>
        </View>
        <Stack.Screen options={{ title: "" }} />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            accessibilityLabel="Cancel"
            disabled={capturing}
            onPress={() => router.back()}
          >
            Cancel
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </>
    );
  }

  return (
    <>
      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        <Column>
          <RNHostView matchContents>
            <Image
              resizeOnTap
              testID="new-post-preview"
              source={{ uri: imageUri }}
              style={{
                width,
                height: width,
              }}
            />
          </RNHostView>

          <Column
            spacing={4}
            style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          >
            {displayName ? (
              <UiText
                testID="new-post-author"
                textStyle={{ fontWeight: "600" }}
              >
                {displayName}
              </UiText>
            ) : null}
            {resolvingLocation ? (
              <UiText>Getting location…</UiText>
            ) : locationLine ? (
              <UiText testID="new-post-location">{locationLine}</UiText>
            ) : null}
            {capturedAt ? (
              <UiText testID="new-post-captured-at">
                {formatCapturedAt(capturedAt)}
              </UiText>
            ) : null}
          </Column>

          <Host ignoreSafeArea="keyboard" style={{ flex: 1 }}>
            <ScrollView style={{ padding: 10 }}>
              <Column
                spacing={12}
                style={{ paddingHorizontal: 12, paddingBottom: 8 }}
              >
                <TextInput
                  testID="new-post-caption"
                  onChangeText={setCaption}
                  placeholder="Write a caption…"
                  maxLength={CAPTION_MAX_LENGTH}
                  multiline
                />

                <Column spacing={4}>
                  <UiText>Who can see this?</UiText>
                  <Host matchContents>
                    <Picker
                      testID="new-post-privacy-picker"
                      selectedValue={privacyScope}
                      onValueChange={(value) =>
                        setPrivacyScope(value as PostPrivacyScope)
                      }
                      appearance="menu"
                    >
                      <Picker.Item label="Public" value="public" />
                      <Picker.Item label="Friends" value="friends_only" />
                      <Picker.Item label="Private" value="private" />
                    </Picker>
                  </Host>
                </Column>

                {submitError ? (
                  <UiText
                    testID="new-post-error"
                    textStyle={{ color: "#DC2626" }}
                  >
                    {submitError}
                  </UiText>
                ) : null}
              </Column>
            </ScrollView>
          </Host>
        </Column>
      </Host>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Cancel"
          disabled={submitting}
          onPress={() => router.back()}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Save for later"
          disabled={submitting}
          onPress={() => { void handleSaveForLater(); }}
        >
          Save
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Button
          accessibilityLabel="Post"
          disabled={submitting}
          variant="done"
          onPress={handleSubmit}
        >
          Post
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  cameraScreen: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraPreview: {
    flex: 1,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  controls: {
    height: 160,
    justifyContent: "center",
    gap: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  focusSquare: {
    position: "absolute",
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: "#FFD60A",
  },
  zoomIndicator: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  zoomIndicatorText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});
