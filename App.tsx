import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { RootStackParamList } from './src/types';
import {
  registerForPushNotifications,
  setupNotificationHandler,
  getLastNotificationResponse,
} from './src/services/notifications';

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
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id).catch(console.error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isInitialized || !user) return;

    const handleNotificationTap = (groupId: string) => {
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate('Group', { groupId });
      }
    };

    notificationCleanupRef.current = setupNotificationHandler(handleNotificationTap);

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
