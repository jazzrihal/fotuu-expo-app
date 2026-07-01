import { Stack } from 'expo-router/stack';

export default function FriendsLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
