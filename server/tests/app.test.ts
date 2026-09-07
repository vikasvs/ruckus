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
    idGenerator: createIdGenerator('user-1', 'group-1', 'member-1', 'invite-1', 'member-2'),
    now: () => new Date('2026-05-25T12:05:00.000Z'),
  });
}

test('GET /health returns ok', async () => {
  const app = createTestApp([]);
  const response = await request(app).get('/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('member history scopes expired posts to the selected member and paginates', async () => {
  const { pool, calls } = createQueuedPool([{ rows: [{
    id: 'event-older', user_id: 'member-1', group_id: 'group-1', first_name: 'Maya',
    status_type: 'ricked', created_at: '2026-01-01T12:00:00Z', expires_at: '2026-01-01T18:00:00Z',
  }] }]);
  const { pushSender } = createMockPushSender();
  const app = createApp({ pool, pushSender, idGenerator: createIdGenerator(), now: () => new Date('2026-09-06') });
  const response = await request(app).get('/api/status/activity/group-1?userId=member-1&limit=30&offset=30');
  assert.equal(response.status, 200);
  assert.equal(response.body[0].status_type, 'ricked');
  assert.equal(response.body[0].users.first_name, 'Maya');
  assert.deepEqual(calls[0].params, ['group-1', 30, 'member-1', 30]);
  assert.match(calls[0].text, /se.user_id = \$3::uuid/);
  assert.match(calls[0].text, /ORDER BY se.created_at DESC, se.id DESC/);
  assert.doesNotMatch(calls[0].text, /expires_at\s*[><]/);
});

test('member history bounds pagination and retains the group-wide endpoint', async () => {
  const { pool, calls } = createQueuedPool([{ rows: [] }]);
  const { pushSender } = createMockPushSender();
  const app = createApp({ pool, pushSender, idGenerator: createIdGenerator(), now: () => new Date() });
  const response = await request(app).get('/api/status/activity/group-1?limit=999&offset=-5');
  assert.equal(response.status, 200);
  assert.deepEqual(calls[0].params, ['group-1', 100, null, 0]);
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

test('PATCH /api/users/:id persists an edited name', async () => {
  const { pool, calls } = createQueuedPool([
    {
      rows: [{
        id: 'user-1',
        first_name: 'Vikas',
        phone: null,
        created_at: '2026-05-25T12:00:00.000Z',
        last_active: '2026-05-25T12:06:00.000Z',
        push_token: null,
        device_platform: null,
      }],
    },
  ]);
  const { pushSender } = createMockPushSender();
  const app = createApp({
    pool,
    pushSender,
    idGenerator: createIdGenerator(),
    now: () => new Date('2026-05-25T12:06:00.000Z'),
  });

  const response = await request(app)
    .patch('/api/users/user-1')
    .send({ first_name: '  Vikas  ' });

  assert.equal(response.status, 200);
  assert.equal(response.body.first_name, 'Vikas');
  assert.deepEqual(calls[0].params, ['Vikas', undefined, undefined, 'user-1']);
  assert.match(calls[0].text, /UPDATE users/);
});

test('POST /api/groups creates a group, membership, and invite link', async () => {
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
        settings: { identity: { timezone: 'UTC' } },
        metadata: {},
      }],
    },
    { rows: [] },
    { rows: [] },
    {
      rows: [{
        id: 'invite-1',
        group_id: 'group-1',
        token: 'share-token',
        is_active: true,
        created_at: '2026-05-25T12:00:00.000Z',
      }],
    },
    { rows: [] },
  ]);

  const response = await request(app)
    .post('/api/groups')
    .send({ name: 'Friday Crew', userId: 'user-1', timezone: 'UTC' });

  assert.equal(response.status, 201);
  assert.equal(response.body.name, 'Friday Crew');
  assert.equal(response.body.invite_link.token, 'share-token');
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
        notification_mode: 'all_activity',
        watch_threshold: null,
        watch_until: null,
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
