import { buildInviteMessage } from '@/utils';

describe('buildInviteMessage', () => {
  it('creates a sendable invite message with the group name and code', () => {
    expect(buildInviteMessage('Friday Crew', 'ABCD1234')).toBe(
      [
        'Join "Friday Crew" on Ruckus.',
        'Invite code: ABCD1234',
        'Open the app and tap Join Group to use it.',
      ].join('\n')
    );
  });
});
