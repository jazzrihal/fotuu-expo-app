import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Button,
  Column,
  Host,
  Picker,
  Row,
  RNHostView,
  ScrollView,
  Text as UiText,
  TextInput,
} from "@expo/ui";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Empty } from "@/components/empty";
import { EmptyActionsSheet } from "@/components/empty-actions-sheet";
import { Image } from "@/components/image";
import * as Location from "expo-location";
import { Stack, useRouter, useTheme } from "expo-router";
import { useAuth } from "@/context/auth";
import { resolvePostLocationParts } from "@/lib/location-label";
import { buildLocationLine, formatCapturedAt } from "@/lib/post-display";
import { type PostPrivacyScope } from "@/lib/posts";
import { useCreatePostMutation } from "@/queries/posts";
import { useUserProfileQuery } from "@/queries/profile";

const CAPTION_MAX_LENGTH = 500;

function authorFallback(email: string | undefined): string {
  if (!email) {
    return "";
  }

  return email.split("@")[0] ?? "";
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
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [caption, setCaption] = useState("");
  const [privacyScope, setPrivacyScope] =
    useState<PostPrivacyScope>("friends_only");
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraSheetOpen, setCameraSheetOpen] = useState(true);

  const profileQuery = useUserProfileQuery(session?.user.id, {
    enabled: !!session?.user.id && !!imageUri,
  });

  const createPostMutation = useCreatePostMutation();

  const displayName =
    profileQuery.data?.display_name ??
    authorFallback(session?.user.email);

  useEffect(() => {
    if (!imageUri) {
      return;
    }

    let cancelled = false;

    async function resolveLocation() {
      setResolvingLocation(true);
      setLocationLine(null);
      setLatitude(undefined);
      setLongitude(undefined);

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
  }, [imageUri]);

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
        onError: (mutationError) => {
          setError(mutationError.message);
        },
      },
    );
  }

  const submitting = createPostMutation.isPending;
  const submitError =
    error ?? profileQuery.error?.message ?? createPostMutation.error?.message ?? null;

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
          <View style={styles.cameraPreview}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          </View>
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
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 16,
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
