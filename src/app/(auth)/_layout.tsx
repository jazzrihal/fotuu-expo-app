import { Redirect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuth } from '@/context/auth';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (session) return <Redirect href="/(app)" />;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
