import '@/lib/query-native';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/context/auth';
import { queryClient } from '@/lib/query-client';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Slot />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
