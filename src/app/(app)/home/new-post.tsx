import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button, Column, Host, Picker, Text as ExpoText } from '@expo/ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from '@/components/image';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { createPost, uploadPostImage, type PostPrivacyScope } from '@/lib/posts';

const CAPTION_MAX_LENGTH = 500;

export default function NewPostScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [privacyScope, setPrivacyScope] = useState<PostPrivacyScope>('friends_only');
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError('Failed to capture photo. Please try again.');
        return;
      }

      setImageUri(photo.uri);
    } catch {
      setError('Failed to capture photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  }

  async function handleSubmit() {
    if (!imageUri || !session?.user.id || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.granted) {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
    } catch {
      // Location is optional; continue without coordinates.
    }

    const { path, error: uploadError } = await uploadPostImage(imageUri, session.user.id);
    if (uploadError || !path) {
      setSubmitting(false);
      setError(uploadError ?? 'Failed to upload image.');
      return;
    }

    const { error: createError } = await createPost({
      storagePath: path,
      capturedAt: new Date().toISOString(),
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
        <Host style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </Host>
      );
    }

    if (!permission.granted) {
      return (
        <Host style={{ flex: 1 }}>
          <Column spacing={12} style={{ padding: 24 }}>
            <ExpoText>Camera permission is required to create a post.</ExpoText>
            {error ? <ExpoText testID="new-post-error">{error}</ExpoText> : null}
            <Button
              testID="new-post-request-camera-permission"
              variant="filled"
              label="Grant camera access"
              onPress={() => {
                void requestPermission();
              }}
            />
            <Button variant="text" label="Cancel" onPress={() => router.back()} />
          </Column>
        </Host>
      );
    }

    return (
      <>
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.controls}>
            {error ? (
              <Text selectable testID="new-post-error" style={styles.errorText}>
                {error}
              </Text>
            ) : null}
            <TouchableOpacity
              testID="camera-shutter-button"
              accessibilityLabel="Take photo"
              style={styles.shutterButton}
              disabled={capturing}
              onPress={() => {
                void handleShutter();
              }}
            >
              {capturing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerShadowVisible: false,
            title: '',
          }}
        />
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
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Image
          testID="new-post-preview"
          source={{ uri: imageUri }}
          style={{
            width,
            height: width,
          }}
          contentFit="cover"
        />

        <View style={styles.formContent}>
          <View style={styles.section}>
            <Text selectable style={styles.sectionLabel}>
              Caption
            </Text>
            <TextInput
              testID="new-post-caption"
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption…"
              maxLength={CAPTION_MAX_LENGTH}
              multiline
              textAlignVertical="top"
              style={styles.captionInput}
            />
          </View>

          <View style={styles.section}>
            <Text selectable style={styles.sectionLabel}>
              Who can see this?
            </Text>
            <Host matchContents>
              <Picker
                testID="new-post-privacy-picker"
                selectedValue={privacyScope}
                onValueChange={(value) => setPrivacyScope(value as PostPrivacyScope)}
                appearance="menu"
              >
                <Picker.Item label="Public" value="public" />
                <Picker.Item label="Friends" value="friends_only" />
                <Picker.Item label="Private" value="private" />
              </Picker>
            </Host>
          </View>

          {error ? (
            <Text selectable testID="new-post-error" style={styles.previewError}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
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
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    height: 160,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 16,
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  formContent: {
    padding: 24,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  captionInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    borderCurve: 'continuous',
    padding: 12,
    fontSize: 16,
  },
  previewError: {
    color: '#c00',
  },
});
