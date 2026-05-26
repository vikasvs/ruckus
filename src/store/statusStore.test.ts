import {
  checkCooldown as checkCooldownService,
  getGroupStatus,
  getRecentActivity,
  updateStatus as updateStatusService,
} from '@/services/status';
import { useStatusStore } from '@/store/statusStore';

jest.mock('@/services/status', () => ({
  updateStatus: jest.fn(),
  getGroupStatus: jest.fn(),
  getRecentActivity: jest.fn(),
  checkCooldown: jest.fn(),
}));

const mockedUpdateStatus = jest.mocked(updateStatusService);
const mockedGetGroupStatus = jest.mocked(getGroupStatus);
const mockedGetRecentActivity = jest.mocked(getRecentActivity);
const mockedCheckCooldown = jest.mocked(checkCooldownService);

describe('statusStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useStatusStore.getState().reset();
    mockedUpdateStatus.mockResolvedValue(undefined as never);
    mockedGetGroupStatus.mockResolvedValue([]);
    mockedGetRecentActivity.mockResolvedValue([]);
    mockedCheckCooldown.mockResolvedValue(0);
  });

  afterEach(() => {
    useStatusStore.getState().reset();
    jest.useRealTimers();
  });

  it('sets cooldown and refreshes activity after a status update', async () => {
    await useStatusStore.getState().updateStatus('user-1', 'group-1', 'rucked');

    expect(mockedUpdateStatus).toHaveBeenCalledWith('user-1', 'group-1', 'rucked');
    expect(mockedGetRecentActivity).toHaveBeenCalledWith('group-1', 20);
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
});
