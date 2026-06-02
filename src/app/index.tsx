import { Redirect } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (session) return <Redirect href="/(app)/home" />;

  return <Redirect href="/(auth)/sign-in" />;
}
