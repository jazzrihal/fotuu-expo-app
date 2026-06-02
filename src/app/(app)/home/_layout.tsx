import { Stack } from 'expo-router/stack';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: 'minimal',
      }}
    />
  );
}
