import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Image, type ImageContentFit, type ImageProps } from "@/components/image";
import {
  ZOOM_MIN_SCALE,
  clampOffset,
  clampScale,
} from "@/lib/zoomable-image-gestures";

function toggleContentFit(fit: ImageContentFit): ImageContentFit {
  return fit === "cover" ? "contain" : "cover";
}

function contentFitAccessibilityLabel(fit: ImageContentFit): string {
  return `Photo, ${fit}`;
}

type ZoomableImageProps = {
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  contentFit?: ImageContentFit;
} & Pick<ImageProps, "source" | "placeholder" | "transition">;

export function ZoomableImage({
  width,
  height,
  style,
  testID,
  source,
  contentFit = "cover",
  placeholder,
  transition,
}: ZoomableImageProps) {
  const [activeContentFit, setActiveContentFit] =
    useState<ImageContentFit>(contentFit);

  const scale = useSharedValue(ZOOM_MIN_SCALE);
  const savedScale = useSharedValue(ZOOM_MIN_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const containerWidth = useSharedValue(width);
  const containerHeight = useSharedValue(height);
  const didZoomOrPan = useSharedValue(false);

  useEffect(() => {
    containerWidth.value = width;
    containerHeight.value = height;
  }, [containerHeight, containerWidth, height, width]);

  const handleToggleContentFit = useCallback(() => {
    setActiveContentFit((current) => toggleContentFit(current));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  /* eslint-disable react-hooks/immutability -- Reanimated shared values mutate in RNGH worklets */
  const gesture = useMemo(() => {
    const pinchGesture = Gesture.Pinch()
      .onBegin(() => {
        didZoomOrPan.value = true;
        savedScale.value = scale.value;
      })
      .onUpdate((event) => {
        scale.value = clampScale(savedScale.value * event.scale);
      })
      .onEnd(() => {
        savedScale.value = scale.value;

        if (scale.value <= 1) {
          scale.value = withTiming(1);
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          savedScale.value = 1;
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
          return;
        }

        translateX.value = clampOffset(
          translateX.value,
          containerWidth.value,
          scale.value,
        );
        translateY.value = clampOffset(
          translateY.value,
          containerHeight.value,
          scale.value,
        );
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const panGesture = Gesture.Pan()
      .manualActivation(true)
      .onTouchesMove((_event, state) => {
        if (scale.value > 1) {
          state.activate();
        } else {
          state.fail();
        }
      })
      .onStart(() => {
        didZoomOrPan.value = true;
      })
      .onUpdate((event) => {
        translateX.value = clampOffset(
          savedTranslateX.value + event.translationX,
          containerWidth.value,
          scale.value,
        );
        translateY.value = clampOffset(
          savedTranslateY.value + event.translationY,
          containerHeight.value,
          scale.value,
        );
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const tapGesture = Gesture.Tap()
      .maxDistance(10)
      .onTouchesDown(() => {
        didZoomOrPan.value = false;
      })
      .onEnd(() => {
        if (didZoomOrPan.value) {
          return;
        }
        runOnJS(handleToggleContentFit)();
      });

    return Gesture.Simultaneous(
      Gesture.Simultaneous(pinchGesture, panGesture),
      tapGesture,
    );
  }, [
    containerHeight,
    containerWidth,
    didZoomOrPan,
    handleToggleContentFit,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
  ]);
  /* eslint-enable react-hooks/immutability */

  const flattenedStyle = StyleSheet.flatten([styles.container, style]);

  return (
    <View
      accessibilityLabel={contentFitAccessibilityLabel(activeContentFit)}
      accessibilityRole="button"
      style={flattenedStyle}
      testID={testID}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.imageLayer, animatedStyle]}>
          <Image
            contentFit={activeContentFit}
            placeholder={placeholder}
            source={source}
            style={StyleSheet.absoluteFill}
            transition={transition}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  imageLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
