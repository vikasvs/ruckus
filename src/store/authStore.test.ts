import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '@/services/user';
import { useAuthStore } from '@/store/authStore';

jest.mock('@/services/user', () => ({
  getUserProfile: jest.fn(),
}));

const mockedGetUserProfile = jest.mocked(getUserProfile);

const baseProfile = {
  id: 'user-1',
  phone: '',
  first_name: 'Casey',
  created_at: '2026-05-25T12:00:00.000Z',
  last_active: '2026-05-25T12:00:00.000Z',
};

describe('authStore', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useAuthStore.setState({
      session: null,
      user: null,
      profile: null,
      isLoading: true,
      isInitialized: false,
      needsName: false,
    });
  });

  it('prompts for a name when no stored user exists', async () => {
    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      user: null,
      profile: null,
      needsName: true,
      isLoading: false,
      isInitialized: true,
    });
  });

  it('hydrates a stored user and profile', async () => {
    await AsyncStorage.setItem('ruckus_user_id', 'user-1');
    mockedGetUserProfile.mockResolvedValue(baseProfile);

    await useAuthStore.getState().initialize();

    expect(mockedGetUserProfile).toHaveBeenCalledWith('user-1');
    expect(useAuthStore.getState()).toMatchObject({
      session: { userId: 'user-1' },
      user: { id: 'user-1' },
      profile: baseProfile,
      needsName: false,
      isLoading: false,
      isInitialized: true,
    });
  });

  it('clears the stored user on sign out', async () => {
    await useAuthStore.getState().setUser('user-1');

    await useAuthStore.getState().signOut();

    expect(await AsyncStorage.getItem('ruckus_user_id')).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      user: null,
      profile: null,
      needsName: true,
    });
  });
});
