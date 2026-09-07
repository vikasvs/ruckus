import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { createIdGenerator, createMockPushSender, createQueuedPool } from './helpers';

const code = 'A'.repeat(40);
const requestId = '4e8930a2-fb4a-44c7-93ac-9c53090e1a81';
function setup(responses: { rows: Record<string, unknown>[] }[] = []) {
  const { pool, calls } = createQueuedPool(responses);
  const { pushSender } = createMockPushSender();
  const app = createApp({ pool, pushSender, idGenerator: createIdGenerator(), now: () => new Date('2026-09-07T12:00:00Z') });
  return { app, calls };
}

test('recovery returns the original identity, hashes the code, and uses atomic expiry/replay checks', async () => {
  const { app, calls } = setup([{ rows: [{ id: 'original-user', first_name: 'Kas' }] }]);
  const result = await request(app).post('/api/recovery/redeem').send({ code: code.toLowerCase().match(/.{8}/g)!.join('-'), requestId });
  assert.equal(result.status, 200);
  assert.equal(result.body.id, 'original-user');
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].params?.[0], createHash('sha256').update(code).digest('hex'));
  assert.match(calls[0].text, /UPDATE account_recovery_codes/);
  assert.match(calls[0].text, /expires_at > \$3/);
  assert.match(calls[0].text, /redemption_id = \$2/);
  assert.match(calls[0].text, /10 minutes/);
  assert.doesNotMatch(calls[0].text, /INSERT INTO (users|group_members)/);
});
test('expired, consumed, and unknown codes share the same failure', async () => {
  const { app } = setup([{ rows: [] }]);
  const result = await request(app).post('/api/recovery/redeem').send({ code, requestId });
  assert.equal(result.status, 400);
  assert.match(result.body.error, /invalid, expired, or already used/);
});
test('a name or bare user ID cannot recover an account', async () => {
  const { app, calls } = setup();
  for (const payload of [{ code: 'Kas', requestId }, { userId: 'original-user' }, { code, requestId: 'invalid' }]) {
    assert.equal((await request(app).post('/api/recovery/redeem').send(payload)).status, 400);
  }
  assert.equal(calls.length, 0);
});
test('recovery attempts are rate limited', async () => {
  const { app } = setup();
  for (let i = 0; i < 30; i++) await request(app).post('/api/recovery/redeem').send({ code: 'bad' });
  const result = await request(app).post('/api/recovery/redeem').send({ code: 'bad' });
  assert.equal(result.status, 429);
  assert.equal(result.headers['retry-after'], '60');
});
test('database failures do not reveal internals or credentials', async () => {
  const { app } = setup();
  const result = await request(app).post('/api/recovery/redeem').send({ code, requestId });
  assert.equal(result.status, 503);
  assert.doesNotMatch(JSON.stringify(result.body), /SELECT|UPDATE|AAAA/);
});
