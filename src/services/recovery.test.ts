import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { recoverAccount } from './recovery';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async (_algorithm, code) => `hash:${code.slice(0, 8)}`),
  randomUUID: jest.fn(() => '4e8930a2-fb4a-44c7-93ac-9c53090e1a81'),
}));
const code = 'A'.repeat(40);
describe('account recovery retries', () => {
  beforeEach(async () => { jest.restoreAllMocks(); await AsyncStorage.clear(); });
  it('retries a lost response with the same request ID without storing the raw code', async () => {
    const post = jest.spyOn(api, 'post').mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ id: 'original-user' });
    await expect(recoverAccount(code)).rejects.toThrow('Offline');
    await expect(recoverAccount(code.toLowerCase().match(/.{8}/g)!.join('-'))).resolves.toEqual({ id: 'original-user' });
    expect(post.mock.calls[0][1]).toEqual(post.mock.calls[1][1]);
    expect(await AsyncStorage.getItem('ruckus_recovery_attempt')).not.toContain(code);
  });
  it('does not consume a code when retry metadata cannot be stored', async () => {
    const post = jest.spyOn(api, 'post');
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Storage full'));
    await expect(recoverAccount(code)).rejects.toThrow('Storage full');
    expect(post).not.toHaveBeenCalled();
  });
  it('rejects names and incomplete codes without calling the API', async () => {
    const post = jest.spyOn(api, 'post');
    await expect(recoverAccount('Kas')).rejects.toThrow('complete recovery code');
    expect(post).not.toHaveBeenCalled();
  });
});
