import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { Navigation } from './src/navigation';
import { useAuth } from './src/hooks/useAuth';
import { colors } from './src/utils/colors';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AppContent() {
  const { refreshSession } = useAuth();

  useEffect(() => {
    async function prepare() {
      await refreshSession();
      await SplashScreen.hideAsync();
    }
    prepare();
  }, [refreshSession]);

  return <Navigation />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AppContent />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
