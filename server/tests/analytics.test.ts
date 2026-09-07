import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { buildGroupAnalytics } from '../src/analytics';
import { createApp } from '../src/app';
import { createIdGenerator, createMockPushSender, createQueuedPool } from './helpers';

test('buildGroupAnalytics creates a gamified leaderboard and recap summary', () => {
  const analytics = buildGroupAnalytics(
    {
      members: [
        { user_id: 'user-1', first_name: 'Alice' },
        { user_id: 'user-2', first_name: 'Bob' },
        { user_id: 'user-3', first_name: 'Cara' },
      ],
      events: [
        { user_id: 'user-1', status_type: 'rucked', created_at: '2026-05-29T14:00:00.000Z' },
        { user_id: 'user-1', status_type: 'rucked', created_at: '2026-05-30T14:00:00.000Z' },
        { user_id: 'user-2', status_type: 'ricked', created_at: '2026-05-30T15:00:00.000Z' },
        { user_id: 'user-1', status_type: 'ricked', created_at: '2026-05-31T11:58:00.000Z' },
        { user_id: 'user-2', status_type: 'ricked', created_at: '2026-05-31T12:01:00.000Z' },
        { user_id: 'user-3', status_type: 'rucked', created_at: '2026-05-31T12:04:00.000Z' },
      ],
      bursts: [
        {
          triggered_by: 'user-2',
          window_started_at: '2026-05-31T11:58:00.000Z',
          window_ended_at: '2026-05-31T12:02:00.000Z',
          distinct_member_count: 3,
          created_at: '2026-05-31T12:02:00.000Z',
        },
      ],
      recaps: [
        {
          id: 'recap-1',
          title: 'Friday Crew erupted.',
          created_at: '2026-05-31T13:40:00.000Z',
          photo_count: 0,
          caption: null,
        },
      ],
      currentUserId: 'user-2',
      timeZone: 'UTC',
      freezeCount: 1,
      window: 'week',
    },
    new Date('2026-05-31T16:00:00.000Z')
  );

  assert.equal(analytics.group.totalEvents, 6);
  assert.equal(analytics.group.totalRuckusBursts, 1);
  assert.equal(analytics.group.currentStreakWeeks, 1);
  assert.equal(analytics.group.freezeCount, 1);
  assert.equal(analytics.dailyActivity[6].burstCount, 1);
  assert.equal(analytics.recaps.length, 1);
  assert.equal(analytics.leaderboard.length, 3);
  assert.equal(analytics.me?.firstName, 'Bob');
  assert.ok((analytics.me?.score ?? 0) > 0);
});

test('GET /api/status/analytics/:groupId/:userId returns the analytics payload', async () => {
  const { pool } = createQueuedPool([
    { rows: [{ id: 'group-1', name: 'Friday Crew', settings: { identity: { timezone: 'UTC' }, streak_freezes_remaining: 2 } }] },
    { rows: [] },
    { rows: [] },
    { rows: [{ id: 'group-1', name: 'Friday Crew', settings: { identity: { timezone: 'UTC' }, streak_freezes_remaining: 2 } }] },
    { rows: [{ user_id: 'user-1', first_name: 'Alice' }] },
    { rows: [{ user_id: 'user-1', status_type: 'rucked', created_at: '2026-05-31T12:00:00.000Z' }] },
    { rows: [] },
    { rows: [] },
  ]);
  const { pushSender } = createMockPushSender();

  const app = createApp({
    pool,
    pushSender,
    idGenerator: createIdGenerator(),
    now: () => new Date('2026-05-31T16:00:00.000Z'),
  });

  const response = await request(app).get('/api/status/analytics/group-1/user-1?window=week');

  assert.equal(response.status, 200);
  assert.equal(response.body.window, 'week');
  assert.equal(response.body.group.totalEvents, 1);
  assert.equal(response.body.group.totalRuckusBursts, 0);
  assert.equal(response.body.group.freezeCount, 2);
  assert.equal(response.body.leaderboard[0].firstName, 'Alice');
  assert.equal(response.body.me.firstName, 'Alice');
});
