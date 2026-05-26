import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { createIdGenerator, createMockPushSender, createQueuedPool } from './helpers';

function createTestApp(responses: Array<{ rows: Record<string, unknown>[] }>) {
  const { pool } = createQueuedPool(responses);
  const { pushSender } = createMockPushSender();

  return createApp({
    pool,
    pushSender,
    idGenerator: createIdGenerator('user-1', 'group-1', 'member-1', 'member-2'),
    now: () => new Date('2026-05-25T12:05:00.000Z'),
  });
}

test('GET /health returns ok', async () => {
  const app = createTestApp([]);
  const response = await request(app).get('/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('POST /api/users creates a user', async () => {
  const app = createTestApp([
    {
      rows: [{
        id: 'user-1',
        first_name: 'Casey',
        phone: null,
        created_at: '2026-05-25T12:00:00.000Z',
        last_active: '2026-05-25T12:00:00.000Z',
        push_token: null,
        device_platform: null,
      }],
    },
  ]);

  const response = await request(app)
    .post('/api/users')
    .send({ first_name: 'Casey' });

  assert.equal(response.status, 201);
  assert.equal(response.body.id, 'user-1');
  assert.equal(response.body.first_name, 'Casey');
});

test('POST /api/groups creates a group and creator membership', async () => {
  const app = createTestApp([
    { rows: [] },
    {
      rows: [{
        id: 'group-1',
        name: 'Friday Crew',
        invite_code: 'ABCD1234',
        created_by: 'user-1',
        created_at: '2026-05-25T12:00:00.000Z',
        is_active: true,
        settings: {},
        metadata: {},
      }],
    },
    { rows: [] },
    { rows: [] },
  ]);

  const response = await request(app)
    .post('/api/groups')
    .send({ name: 'Friday Crew', userId: 'user-1' });

  assert.equal(response.status, 201);
  assert.equal(response.body.name, 'Friday Crew');
});

test('POST /api/groups/join joins a valid group', async () => {
  const app = createTestApp([
    {
      rows: [{
        id: 'group-1',
        name: 'Friday Crew',
        invite_code: 'ABCD1234',
        created_by: 'user-1',
        created_at: '2026-05-25T12:00:00.000Z',
        is_active: true,
        settings: {},
        metadata: {},
      }],
    },
    { rows: [] },
    { rows: [{ count: '2' }] },
    {
      rows: [{
        id: 'member-2',
        group_id: 'group-1',
        user_id: 'user-2',
        joined_at: '2026-05-25T12:01:00.000Z',
        is_admin: false,
        notifications_enabled: true,
        current_status: null,
        status_updated_at: null,
      }],
    },
  ]);

  const response = await request(app)
    .post('/api/groups/join')
    .send({ inviteCode: 'abcd1234', userId: 'user-2' });

  assert.equal(response.status, 201);
  assert.equal(response.body.group.id, 'group-1');
  assert.equal(response.body.membership.user_id, 'user-2');
});

test('GET /api/status/cooldown returns zero when no recent status exists', async () => {
  const app = createTestApp([{ rows: [] }]);

  const response = await request(app).get('/api/status/cooldown/user-1/group-1');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { remaining: 0 });
});
