import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation';
import { useAuth } from './src/context/AuthContext';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <>
      <StatusBar style="light" backgroundColor="#1a1a2e" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
