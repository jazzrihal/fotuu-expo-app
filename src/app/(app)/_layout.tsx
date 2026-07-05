import { Redirect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuth } from '@/context/auth';
import { PostManagerProvider } from '@/context/post-manager';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <PostManagerProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="user/[id]"
          options={{
            headerBackButtonDisplayMode: 'minimal',
            headerLargeTitle: false,
          }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{
            title: '',
            headerBackButtonDisplayMode: 'minimal',
            headerLargeTitle: false,
          }}
        />
      </Stack>
    </PostManagerProvider>
  );
}
