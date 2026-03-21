import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-url-polyfill/auto';

import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { RootStackParamList } from './src/types';
import ConfigErrorScreen from '@/screens/ConfigErrorScreen';
import { validatePublicEnv } from '@/config/env';
import {
  registerForPushNotifications,
  setupNotificationHandler,
  getLastNotificationResponse,
} from './src/services/notifications';

const envValidation = validatePublicEnv();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF4458" />
    </View>
  );
}

export default function App() {
  const { initialize, isInitialized, isLoading, user } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const notificationCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!envValidation.valid) return;
    initialize();
  }, [initialize]);

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (!envValidation.valid) return;
    if (user?.id) {
      registerForPushNotifications(user.id).catch(console.error);
    }
  }, [user?.id]);

  // Set up notification tap handler
  useEffect(() => {
    if (!envValidation.valid) return;
    if (!isInitialized || !user) return;

    const handleNotificationTap = (groupId: string) => {
      // Navigate to the group screen
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate('Group', { groupId });
      }
    };

    notificationCleanupRef.current = setupNotificationHandler(handleNotificationTap);

    // Check for initial notification (app opened from notification)
    getLastNotificationResponse().then((groupId) => {
      if (groupId && navigationRef.current?.isReady()) {
        navigationRef.current.navigate('Group', { groupId });
      }
    });

    return () => {
      if (notificationCleanupRef.current) {
        notificationCleanupRef.current();
      }
    };
  }, [isInitialized, user]);

  if (!envValidation.valid) {
    return (
      <SafeAreaProvider>
        <ConfigErrorScreen missingKeys={envValidation.missingKeys} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  if (!isInitialized || isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});
