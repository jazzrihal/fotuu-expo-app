/* eslint-disable no-restricted-imports -- wrapper delegates to expo-image */
import { Image as ExpoImage, type ImageProps } from "expo-image";
import * as Device from "expo-device";
import { StyleSheet } from "react-native";

const SIMULATOR_BACKGROUND = "grey";

function ImageComponent({ style, ...props }: ImageProps) {
  return (
    <ExpoImage
      {...props}
      style={StyleSheet.flatten([
        !Device.isDevice ? { backgroundColor: SIMULATOR_BACKGROUND } : undefined,
        style,
      ])}
    />
  );
}

export const Image = Object.assign(ImageComponent, ExpoImage) as typeof ExpoImage;

export type {
  ImageCacheConfig,
  ImageContentFit,
  ImageContentPosition,
  ImageLoadOptions,
  ImagePrefetchOptions,
  ImageProps,
  ImageRef,
  ImageSource,
  ImageTransition,
} from "expo-image";
