import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { maybeCreateGroupRuckusSummary } from '../src/routes/status';
import { createIdGenerator, createMockPushSender, createQueuedPool } from './helpers';

test('maybeCreateGroupRuckusSummary returns a payload when the third distinct member crosses the threshold', async () => {
  const { client } = createQueuedPool([
    { rows: [] },
    { rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] },
    {
      rows: [
        { user_id: 'user-3', status_type: 'rucked', created_at: '2026-05-25T12:05:00.000Z' },
        { user_id: 'user-2', status_type: 'rucked', created_at: '2026-05-25T12:04:00.000Z' },
        { user_id: 'user-1', status_type: 'rucked', created_at: '2026-05-25T12:03:00.000Z' },
      ],
    },
    {
      rows: [{
        id: 'summary-1',
        group_id: 'group-1',
        trigger_event_id: 'event-3',
        triggered_by: 'user-3',
        window_started_at: '2026-05-25T12:03:00.000Z',
        window_ended_at: '2026-05-25T12:05:00.000Z',
        distinct_member_count: 3,
        created_at: '2026-05-25T12:05:00.000Z',
      }],
    },
  ]);

  const summary = await maybeCreateGroupRuckusSummary(client, {
    groupId: 'group-1',
    userId: 'user-3',
    currentEvent: {
      id: 'event-3',
      user_id: 'user-3',
      group_id: 'group-1',
      status_type: 'rucked',
      created_at: '2026-05-25T12:05:00.000Z',
      expires_at: '2026-05-25T16:05:00.000Z',
      previous_status: null,
    },
    idGenerator: createIdGenerator('summary-1'),
  });

  assert.ok(summary);
  assert.equal(summary.record.distinct_member_count, 3);
  assert.equal(summary.uniformStatus, 'rucked');
});

test('maybeCreateGroupRuckusSummary skips notification when the threshold was already met', async () => {
  const { client } = createQueuedPool([
    { rows: [] },
    { rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }, { user_id: 'user-4' }] },
  ]);

  const summary = await maybeCreateGroupRuckusSummary(client, {
    groupId: 'group-1',
    userId: 'user-3',
    currentEvent: {
      id: 'event-4',
      user_id: 'user-3',
      group_id: 'group-1',
      status_type: 'ricked',
      created_at: '2026-05-25T12:06:00.000Z',
      expires_at: '2026-05-25T16:06:00.000Z',
      previous_status: null,
    },
    idGenerator: createIdGenerator('summary-2'),
  });

  assert.equal(summary, null);
});

test('POST /api/status sends direct and ruckus summary pushes when the threshold is crossed', async () => {
  const { pool } = createQueuedPool([
    { rows: [] },
    { rows: [{ current_status: null }] },
    {
      rows: [{
        id: 'event-3',
        user_id: 'user-3',
        group_id: 'group-1',
        status_type: 'rucked',
        created_at: '2026-05-25T12:05:00.000Z',
        expires_at: '2026-05-25T16:05:00.000Z',
        previous_status: null,
      }],
    },
    { rows: [] },
    { rows: [] },
    { rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] },
    {
      rows: [
        { user_id: 'user-3', status_type: 'rucked', created_at: '2026-05-25T12:05:00.000Z' },
        { user_id: 'user-2', status_type: 'rucked', created_at: '2026-05-25T12:04:00.000Z' },
        { user_id: 'user-1', status_type: 'rucked', created_at: '2026-05-25T12:03:00.000Z' },
      ],
    },
    {
      rows: [{
        id: 'summary-1',
        group_id: 'group-1',
        trigger_event_id: 'event-3',
        triggered_by: 'user-3',
        window_started_at: '2026-05-25T12:03:00.000Z',
        window_ended_at: '2026-05-25T12:05:00.000Z',
        distinct_member_count: 3,
        created_at: '2026-05-25T12:05:00.000Z',
      }],
    },
    { rows: [] },
    { rows: [{ first_name: 'Casey', group_name: 'Friday Crew' }] },
    { rows: [{ push_token: 'ExpoPushToken[direct]' }] },
    { rows: [{ group_name: 'Friday Crew' }] },
    { rows: [{ push_token: 'ExpoPushToken[summary]' }] },
  ]);
  const { pushSender, messageBatches } = createMockPushSender();

  const app = createApp({
    pool,
    pushSender,
    idGenerator: createIdGenerator('event-3', 'summary-1'),
    now: () => new Date('2026-05-25T12:05:00.000Z'),
  });

  const response = await request(app)
    .post('/api/status')
    .send({ userId: 'user-3', groupId: 'group-1', statusType: 'rucked' });

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(response.status, 201);
  assert.equal(messageBatches.length, 2);

  const flattened = messageBatches.flat();
  const directMessage = flattened.find((message) => message.channelId === 'rucked');
  const summaryMessage = flattened.find((message) => message.channelId === 'group-ruckus');

  assert.ok(directMessage);
  assert.equal(directMessage.body, 'Casey is rucked up!');

  assert.ok(summaryMessage);
  assert.equal(summaryMessage.title, 'Friday Crew is in a Ruckus');
  assert.equal(summaryMessage.body, '3 people are rucked up right now');
});
