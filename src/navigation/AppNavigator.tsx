import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { colors, typography } from '@/theme';

import AuthScreen from '@/screens/AuthScreen';
import HomeScreen from '@/screens/HomeScreen';
import GroupScreen from '@/screens/GroupScreen';
import CreateGroupScreen from '@/screens/CreateGroupScreen';
import JoinGroupScreen from '@/screens/JoinGroupScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, needsName } = useAuthStore();

  const isAuthenticated = session && !needsName;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          ...typography.subheading,
        },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Ruckus',
            }}
          />
          <Stack.Screen
            name="Group"
            component={GroupScreen}
            options={{ title: 'Group' }}
          />
          <Stack.Screen
            name="CreateGroup"
            component={CreateGroupScreen}
            options={{ title: 'Create Group' }}
          />
          <Stack.Screen
            name="JoinGroup"
            component={JoinGroupScreen}
            options={{ title: 'Join Group' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
