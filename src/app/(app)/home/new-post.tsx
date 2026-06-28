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
  RNHostView,
  ScrollView,
  Text as UiText,
  TextInput,
} from "@expo/ui";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "@/components/image";
import * as Location from "expo-location";
import { Stack, useRouter, useTheme } from "expo-router";
import { useAuth } from "@/context/auth";
import { resolvePostLocationParts } from "@/lib/location-label";
import { buildLocationLine, formatCapturedAt } from "@/lib/post-display";
import {
  createPost,
  uploadPostImage,
  type PostPrivacyScope,
} from "@/lib/posts";
import { supabase } from "@/lib/supabase";

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
  const [displayName, setDisplayName] = useState("");
  const [caption, setCaption] = useState("");
  const [privacyScope, setPrivacyScope] =
    useState<PostPrivacyScope>("friends_only");
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUri || !session?.user.id) {
      return;
    }

    let cancelled = false;
    const userId = session.user.id;
    const userEmail = session.user.email;

    async function loadPreviewMetadata() {
      setResolvingLocation(true);
      setLocationLine(null);
      setLatitude(undefined);
      setLongitude(undefined);
      setDisplayName(authorFallback(userEmail));

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();

      if (!cancelled && profile?.display_name) {
        setDisplayName(profile.display_name);
      }

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

    void loadPreviewMetadata();

    return () => {
      cancelled = true;
    };
  }, [imageUri, session?.user.email, session?.user.id]);

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

  async function handleSubmit() {
    if (!imageUri || !session?.user.id || !capturedAt || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const { path, error: uploadError } = await uploadPostImage(
      imageUri,
      session.user.id,
    );
    if (uploadError || !path) {
      setSubmitting(false);
      setError(uploadError ?? "Failed to upload image.");
      return;
    }

    const { error: createError } = await createPost({
      storagePath: path,
      capturedAt: capturedAt.toISOString(),
      caption,
      privacyScope,
      latitude,
      longitude,
    });

    setSubmitting(false);

    if (createError) {
      setError(createError);
      return;
    }

    router.back();
  }

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
        <Host style={{ flex: 1 }}>
          <Column spacing={12} style={{ padding: 24 }}>
            <UiText>Camera permission is required to create a post.</UiText>
            {error ? <UiText testID="new-post-error">{error}</UiText> : null}
            <Button
              testID="new-post-request-camera-permission"
              variant="filled"
              label="Grant camera access"
              onPress={() => {
                void requestPermission();
              }}
            />
            <Button
              variant="text"
              label="Cancel"
              onPress={() => router.back()}
            />
          </Column>
        </Host>
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
            {error ? (
              <Host matchContents>
                <UiText
                  testID="new-post-error"
                  textStyle={{
                    color: colors.text as string,
                    textAlign: "center",
                  }}
                >
                  {error}
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
              testID="new-post-preview"
              source={{ uri: imageUri }}
              style={{
                width,
                height: width,
              }}
              contentFit="cover"
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
            <ScrollView>
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

                {error ? (
                  <UiText
                    testID="new-post-error"
                    textStyle={{ color: "#DC2626" }}
                  >
                    {error}
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
          onPress={() => {
            void handleSubmit();
          }}
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
