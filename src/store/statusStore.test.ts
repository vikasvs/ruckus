import {
  checkCooldown as checkCooldownService,
  getGroupFeed,
  getGroupStatus,
  updateStatus as updateStatusService,
} from '@/services/status';
import { useStatusStore } from '@/store/statusStore';

jest.mock('@/services/status', () => ({
  updateStatus: jest.fn(),
  getGroupStatus: jest.fn(),
  getGroupFeed: jest.fn(),
  checkCooldown: jest.fn(),
}));

const mockedUpdateStatus = jest.mocked(updateStatusService);
const mockedGetGroupStatus = jest.mocked(getGroupStatus);
const mockedGetGroupFeed = jest.mocked(getGroupFeed);
const mockedCheckCooldown = jest.mocked(checkCooldownService);

describe('statusStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useStatusStore.getState().reset();
    mockedUpdateStatus.mockResolvedValue(undefined as never);
    mockedGetGroupStatus.mockResolvedValue([]);
    mockedGetGroupFeed.mockResolvedValue([]);
    mockedCheckCooldown.mockResolvedValue(0);
  });

  afterEach(() => {
    useStatusStore.getState().reset();
    jest.useRealTimers();
  });

  it('sets cooldown and refreshes activity after a status update', async () => {
    await useStatusStore.getState().updateStatus('user-1', 'group-1', 'rucked');

    expect(mockedUpdateStatus).toHaveBeenCalledWith('user-1', 'group-1', 'rucked', undefined);
    expect(mockedGetGroupFeed).toHaveBeenCalledWith('group-1', 'user-1', 24);
    expect(useStatusStore.getState()).toMatchObject({
      currentStatus: 'rucked',
      cooldownRemaining: 60,
      isLoading: false,
    });
  });

  it('counts down an existing cooldown to zero', async () => {
    mockedCheckCooldown.mockResolvedValue(2);

    await useStatusStore.getState().checkCooldown('user-1', 'group-1');
    expect(useStatusStore.getState().cooldownRemaining).toBe(2);

    jest.advanceTimersByTime(1000);
    expect(useStatusStore.getState().cooldownRemaining).toBe(1);

    jest.advanceTimersByTime(1000);
    expect(useStatusStore.getState().cooldownRemaining).toBe(0);
    expect(useStatusStore.getState().cooldownEndTime).toBeNull();
  });

  it('keeps ruck and rick history while hiding retired ritual prompts', async () => {
    mockedGetGroupFeed.mockResolvedValue([
      {
        type: 'status',
        id: 'status-1',
        created_at: '2026-05-25T12:00:00.000Z',
        group_id: 'group-1',
        user_id: 'user-1',
        first_name: 'Casey',
        status_type: 'rucked',
        reactions: [],
      },
      {
        type: 'ritual',
        id: 'ritual-instance-1',
        created_at: '2026-05-25T11:00:00.000Z',
        group_id: 'group-1',
        ritual_id: 'ritual-1',
        label: 'Friday',
        prompt_template: 'Who is out?',
        scheduled_for: '2026-05-25T11:00:00.000Z',
        expires_at: '2026-05-25T13:00:00.000Z',
      },
    ]);

    await useStatusStore.getState().fetchRecentActivity('group-1', 'user-1');

    expect(useStatusStore.getState().recentActivity.map((item) => item.id)).toEqual(['status-1']);
  });
});
