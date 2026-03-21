import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/services/supabase';
import { User as AppUser } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AppUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  needsName: boolean;

  initialize: () => Promise<void>;
  setSession: (_session: Session | null) => void;
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
      const supabase = getSupabase();

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        set({ session, user: session.user });
        await get().fetchProfile();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ session, user: session?.user || null });

        if (session) {
          await get().fetchProfile();
        } else {
          set({ profile: null, needsName: false });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  setSession: (session) => {
    set({ session, user: session?.user || null });
  },

  setProfile: (profile) => {
    set({ profile });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        set({ profile: data as AppUser, needsName: false });
      } else {
        set({ needsName: true });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  signOut: async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({ session: null, user: null, profile: null, needsName: false });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },
}));
