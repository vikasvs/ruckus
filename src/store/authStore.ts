import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as AppUser } from '@/types';
import { getUserProfile } from '@/services/user';

const USER_ID_KEY = 'ruckus_user_id';

interface AuthState {
  session: { userId: string } | null;
  user: { id: string } | null;
  profile: AppUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  needsName: boolean;

  initialize: () => Promise<void>;
  setUser: (_userId: string) => Promise<void>;
  setProfile: (_profile: AppUser | null) => void;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  needsName: false,

  initialize: async () => {
    try {
      set({ isLoading: true });

      const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);

      if (storedUserId) {
        set({ session: { userId: storedUserId }, user: { id: storedUserId } });
        await get().fetchProfile();
      } else {
        set({ needsName: true });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ needsName: true });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  setUser: async (userId: string) => {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
    set({ session: { userId }, user: { id: userId } });
  },

  setProfile: (profile) => {
    set({ profile });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const profile = await getUserProfile(user.id);

      if (profile) {
        set({ profile, needsName: false });
      } else {
        await AsyncStorage.removeItem(USER_ID_KEY);
        set({ session: null, user: null, needsName: true });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  signOut: async () => {
    await AsyncStorage.removeItem(USER_ID_KEY);
    set({ session: null, user: null, profile: null, needsName: true });
  },
}));
