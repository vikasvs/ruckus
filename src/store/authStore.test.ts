import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, updateUserProfile } from '@/services/user';
import { useAuthStore } from '@/store/authStore';

jest.mock('@/services/user', () => ({
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
}));

const mockedGetUserProfile = jest.mocked(getUserProfile);
const mockedUpdateUserProfile = jest.mocked(updateUserProfile);

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
      initializationError: null,
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

  it('preserves identity during profile network/server failures and recovers on retry', async () => {
    await AsyncStorage.setItem('ruckus_user_id', 'user-1');
    mockedGetUserProfile.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue(baseProfile);
    await useAuthStore.getState().initialize();
    expect(await AsyncStorage.getItem('ruckus_user_id')).toBe('user-1');
    expect(useAuthStore.getState()).toMatchObject({ user: { id: 'user-1' }, needsName: false });
    await useAuthStore.getState().fetchProfile();
    expect(useAuthStore.getState().profile).toEqual(baseProfile);
  });

  it('blocks signup if local storage cannot be read', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Storage unavailable'));
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().initializationError).toBeTruthy();
    expect(mockedGetUserProfile).not.toHaveBeenCalled();
  });

  it('only clears identity after a confirmed missing profile', async () => {
    await AsyncStorage.setItem('ruckus_user_id', 'user-1');
    mockedGetUserProfile.mockResolvedValueOnce(null);
    await useAuthStore.getState().initialize();
    expect(await AsyncStorage.getItem('ruckus_user_id')).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({ user: null, needsName: true });
  });

  it('has no destructive sign-out action while recovery is support-assisted', () => {
    expect(useAuthStore.getState()).not.toHaveProperty('signOut');
  });

  it('persists an edited name and updates the local profile', async () => {
    await useAuthStore.getState().setUser('user-1');
    useAuthStore.setState({ profile: baseProfile });
    mockedUpdateUserProfile.mockResolvedValue({ ...baseProfile, first_name: 'Vikas' });

    await useAuthStore.getState().updateName('  Vikas  ');

    expect(mockedUpdateUserProfile).toHaveBeenCalledWith('user-1', { first_name: 'Vikas' });
    expect(useAuthStore.getState().profile?.first_name).toBe('Vikas');
  });
});
