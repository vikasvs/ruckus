import type { PushMessage, PushSender } from './app-dependencies';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export const expoPushSender: PushSender = {
  async send(messages: PushMessage[]): Promise<void> {
    if (messages.length === 0) return;

    for (const chunk of chunkMessages(messages, 100)) {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'accept-encoding': 'gzip, deflate',
          'content-type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json().catch(() => null) as
        | { errors?: unknown[] }
        | null;

      if (!response.ok) {
        throw new Error(
          `Expo push send failed with ${response.status}: ${JSON.stringify(result)}`
        );
      }

      if (result?.errors?.length) {
        console.warn('Expo push send returned errors:', JSON.stringify(result.errors));
      }
    }
  },
};

export function isExpoPushToken(token: unknown): token is string {
  return typeof token === 'string' &&
    /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
}

function chunkMessages<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
