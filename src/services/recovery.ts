import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { User } from '@/types';
import { api } from './api';

const ATTEMPT_KEY = 'ruckus_recovery_attempt';

export async function recoverAccount(input: string): Promise<User> {
  const code = input.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-F0-9]{40}$/.test(code)) throw new Error('Paste the complete recovery code you were given.');
  const fingerprint = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, code);
  const stored = await AsyncStorage.getItem(ATTEMPT_KEY);
  let previous: { fingerprint?: string; requestId?: string } | null = null;
  try { previous = stored ? JSON.parse(stored) : null; } catch { /* Replace corrupt retry metadata. */ }
  const requestId = previous?.fingerprint === fingerprint && typeof previous.requestId === 'string'
    ? previous.requestId : Crypto.randomUUID();
  // Save before redeeming. A response lost in transit can be retried with this same ID.
  // The raw code is never persisted, logged, or put into a URL.
  await AsyncStorage.setItem(ATTEMPT_KEY, JSON.stringify({ fingerprint, requestId }));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    return await api.post<User>('/api/recovery/redeem', { code, requestId }, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Recovery timed out. Keep this code and try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}
