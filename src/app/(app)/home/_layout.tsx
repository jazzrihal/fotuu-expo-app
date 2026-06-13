import { Stack } from 'expo-router/stack';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="new-post"
        options={{
          title: 'New Post',
          presentation: 'fullScreenModal',
          headerLargeTitle: false,
        }}
      />
    </Stack>
  );
}
