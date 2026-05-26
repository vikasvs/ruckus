import assert from 'node:assert/strict';
import type {
  DatabaseClientLike,
  DatabasePoolLike,
  PushMessage,
  PushSender,
  QueryResultLike,
} from '../src/app-dependencies';

interface QueryCall {
  text: string;
  params?: readonly unknown[];
}

export function createQueuedPool(responses: QueryResultLike[]) {
  const calls: QueryCall[] = [];
  let index = 0;

  const query: DatabasePoolLike['query'] = async (text, params) => {
    calls.push({ text, params });
    const response = responses[index];
    index += 1;
    assert.ok(response, `No queued response for query ${text}`);
    return response;
  };

  const client: DatabaseClientLike = {
    query,
    release() {},
  };

  const pool: DatabasePoolLike = {
    query,
    async connect() {
      return client;
    },
  };

  return { calls, client, pool };
}

export function createMockPushSender() {
  const messageBatches: PushMessage[][] = [];

  const pushSender: PushSender = {
    async send(messages) {
      messageBatches.push(messages);
    },
  };

  return { pushSender, messageBatches };
}

export function createIdGenerator(...ids: string[]) {
  let index = 0;
  return () => ids[index++] ?? `generated-id-${index}`;
}
