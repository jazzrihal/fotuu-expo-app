import { Redirect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Pressable, Text } from 'react-native';
import { useAuth } from '@/context/auth';

export default function AppLayout() {
  const { session, loading, signOut } = useAuth();

  if (loading) return null;

  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerBackButtonDisplayMode: 'minimal',
        headerRight: () => (
          <Pressable onPress={signOut} hitSlop={8}>
            <Text style={{ color: '#2563EB', fontSize: 16 }}>Sign out</Text>
          </Pressable>
        ),
      }}
    />
  );
}
