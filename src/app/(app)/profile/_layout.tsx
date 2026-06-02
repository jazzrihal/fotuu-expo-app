import { Stack } from 'expo-router/stack';
import { Pressable, Text } from 'react-native';
import { useAuth } from '@/context/auth';

export default function ProfileLayout() {
  const { signOut } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: 'minimal',
        headerRight: () => (
          <Pressable testID="sign-out-button" onPress={signOut} hitSlop={8}>
            <Text style={{ color: '#2563EB', fontSize: 16 }}>Sign out</Text>
          </Pressable>
        ),
      }}
    />
  );
}
