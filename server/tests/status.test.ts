import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { maybeCreateGroupRuckusSummary } from '../src/routes/status';
import { createIdGenerator, createMockPushSender, createQueuedPool } from './helpers';

test('maybeCreateGroupRuckusSummary returns a payload when the second distinct member crosses the threshold', async () => {
  const { client } = createQueuedPool([
    { rows: [] },
    { rows: [{ user_id: 'user-1' }] },
    {
      rows: [
        { user_id: 'user-2', status_type: 'rucked', created_at: '2026-05-25T12:05:00.000Z' },
        { user_id: 'user-1', status_type: 'rucked', created_at: '2026-05-25T12:03:00.000Z' },
      ],
    },
    {
      rows: [{
        id: 'summary-1',
        group_id: 'group-1',
        trigger_event_id: 'event-2',
        triggered_by: 'user-2',
        window_started_at: '2026-05-25T12:03:00.000Z',
        window_ended_at: '2026-05-25T12:05:00.000Z',
        distinct_member_count: 2,
        created_at: '2026-05-25T12:05:00.000Z',
      }],
    },
  ]);

  const summary = await maybeCreateGroupRuckusSummary(client, {
    groupId: 'group-1',
    userId: 'user-2',
    currentEvent: {
      id: 'event-2',
      user_id: 'user-2',
      group_id: 'group-1',
      status_type: 'rucked',
      created_at: '2026-05-25T12:05:00.000Z',
      expires_at: '2026-05-25T16:05:00.000Z',
      previous_status: null,
      source_event_id: null,
      ritual_instance_id: null,
    },
    idGenerator: createIdGenerator('summary-1'),
  });

  assert.ok(summary);
  assert.equal(summary.record.distinct_member_count, 2);
  assert.equal(summary.uniformStatus, 'rucked');
});

test('maybeCreateGroupRuckusSummary skips notification when the threshold was already met', async () => {
  const { client } = createQueuedPool([
    { rows: [] },
    { rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }, { user_id: 'user-4' }] },
    {
      rows: [
        { user_id: 'user-4', status_type: 'ricked', created_at: '2026-05-25T12:05:30.000Z' },
        { user_id: 'user-2', status_type: 'ricked', created_at: '2026-05-25T12:05:00.000Z' },
        { user_id: 'user-1', status_type: 'rucked', created_at: '2026-05-25T12:04:00.000Z' },
      ],
    },
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
      source_event_id: null,
      ritual_instance_id: null,
    },
    idGenerator: createIdGenerator('summary-2'),
  });

  assert.equal(summary, null);
});

test('maybeCreateGroupRuckusSummary does not count two events from the same member', async () => {
  const { client } = createQueuedPool([
    { rows: [] },
    { rows: [{ user_id: 'user-1' }] },
    {
      rows: [
        { user_id: 'user-1', status_type: 'ricked', created_at: '2026-05-25T12:05:00.000Z' },
        { user_id: 'user-1', status_type: 'rucked', created_at: '2026-05-25T12:03:00.000Z' },
      ],
    },
  ]);

  const summary = await maybeCreateGroupRuckusSummary(client, {
    groupId: 'group-1',
    userId: 'user-1',
    currentEvent: {
      id: 'event-2',
      user_id: 'user-1',
      group_id: 'group-1',
      status_type: 'ricked',
      created_at: '2026-05-25T12:05:00.000Z',
      expires_at: '2026-05-25T16:05:00.000Z',
      previous_status: 'rucked',
      source_event_id: null,
      ritual_instance_id: null,
    },
    idGenerator: createIdGenerator('summary-1'),
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
        source_event_id: null,
        ritual_instance_id: null,
      }],
    },
    { rows: [] },
    { rows: [] },
    { rows: [{ user_id: 'user-1' }] },
    {
      rows: [
        { user_id: 'user-3', status_type: 'rucked', created_at: '2026-05-25T12:05:00.000Z' },
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
        distinct_member_count: 2,
        created_at: '2026-05-25T12:05:00.000Z',
      }],
    },
    { rows: [] },
    { rows: [] },
    { rows: [{ first_name: 'Casey', group_name: 'Friday Crew' }] },
    {
      rows: [{
        user_id: 'user-1',
        notifications_enabled: true,
        notification_mode: 'all_activity',
        watch_threshold: null,
        watch_until: null,
        push_token: 'ExpoPushToken[direct]',
      }],
    },
    {
      rows: [{
        id: 'group-1',
        name: 'Friday Crew',
        settings: { identity: { timezone: 'UTC' } },
      }],
    },
    {
      rows: [{
        user_id: 'user-2',
        notifications_enabled: true,
        notification_mode: 'watch_threshold',
        watch_threshold: 2,
        watch_until: null,
        push_token: 'ExpoPushToken[watch]',
      }],
    },
    {
      rows: [{
        id: 'group-1',
        name: 'Friday Crew',
        settings: { identity: { timezone: 'UTC' } },
      }],
    },
    {
      rows: [{
        user_id: 'user-1',
        notifications_enabled: true,
        notification_mode: 'all_activity',
        watch_threshold: null,
        watch_until: null,
        push_token: 'ExpoPushToken[summary]',
      }],
    },
  ]);
  const { pushSender, messageBatches } = createMockPushSender();

  const app = createApp({
    pool,
    pushSender,
    idGenerator: createIdGenerator('event-3', 'summary-1', 'roll-call-1'),
    now: () => new Date('2026-05-25T12:05:00.000Z'),
  });

  const response = await request(app)
    .post('/api/status')
    .send({ userId: 'user-3', groupId: 'group-1', statusType: 'rucked' });

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(response.status, 201);
  assert.equal(messageBatches.length, 3);

  const flattened = messageBatches.flat();
  const directMessage = flattened.find((message) => message.channelId === 'rucked' && message.to === 'ExpoPushToken[direct]');
  const watchMessage = flattened.find((message) => message.to === 'ExpoPushToken[watch]');
  const summaryMessage = flattened.find((message) => message.channelId === 'group-ruckus' && message.to === 'ExpoPushToken[summary]');

  assert.ok(directMessage);
  assert.equal(directMessage.body, 'Casey is rucked up!');

  assert.ok(watchMessage);
  assert.equal(watchMessage.title, 'Friday Crew is heating up');

  assert.ok(summaryMessage);
  assert.equal(summaryMessage.title, 'Friday Crew is in a Ruckus');
});
