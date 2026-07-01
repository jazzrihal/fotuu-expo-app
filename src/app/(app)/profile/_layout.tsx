import { Stack } from 'expo-router/stack';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          title: '',
          headerLargeTitle: false,
        }}
      />
    </Stack>
  );
}
