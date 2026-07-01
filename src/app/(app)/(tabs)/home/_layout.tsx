import { Stack } from "expo-router/stack";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Feed",
          headerShown: true,
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="map-picker-modal"
        options={{
          title: "Pick Location",
          presentation: "fullScreenModal",
          headerShown: true,
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="new-post"
        options={{
          title: "New Post",
          presentation: "fullScreenModal",
          headerLargeTitle: false,
        }}
      />
    </Stack>
  );
}
