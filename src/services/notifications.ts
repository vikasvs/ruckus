import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { savePushToken } from './user';

function resolveExpoProjectId(): string | undefined {
  const envProjectId = process.env.EXPO_PUBLIC_PROJECT_ID?.trim();
  if (envProjectId) {
    return envProjectId;
  }

  const configProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof configProjectId === 'string' && configProjectId.trim().length > 0) {
    return configProjectId.trim();
  }

  return undefined;
}

// Configure notification handler (skip on web — expo-notifications is native only)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    // Set up Android notification channels
    await Notifications.setNotificationChannelAsync('rucked', {
      name: 'Rucked Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4458',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('ricked', {
      name: 'Ricked Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#9C27B0',
      sound: 'default',
    });
  }

  // Check if running on a physical device (Expo Go or standalone)
  const isDevice = Constants.executionEnvironment === 'storeClient' ||
    Constants.executionEnvironment === 'standalone' ||
    Platform.OS !== 'web';

  if (!isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission for push notifications was denied');
    return null;
  }

  try {
    const projectId = resolveExpoProjectId();
    if (!projectId) {
      console.warn(
        'Push notifications are not configured. Missing EXPO_PUBLIC_PROJECT_ID and extra.eas.projectId.'
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = tokenData.data;

    // Save token to user record
    if (token) {
      await savePushToken(userId, token);
    }

    return token;
  } catch (error) {
    console.warn('Push notifications unavailable:', (error as Error).message);
    return null;
  }
}

export function setupNotificationHandler(
  onNotificationTap: (_groupId: string) => void
): () => void {
  // Handle notification received while app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received in foreground:', notification);
  });

  // Handle notification tap (background or killed)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.groupId) {
      onNotificationTap(data.groupId as string);
    }
  });

  // Clear badge count
  Notifications.setBadgeCountAsync(0);

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

export async function getLastNotificationResponse(): Promise<string | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response?.notification.request.content.data?.groupId) {
    return response.notification.request.content.data.groupId as string;
  }
  return null;
}
