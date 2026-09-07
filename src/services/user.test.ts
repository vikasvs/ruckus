import { api, ApiError } from './api';
import { getUserProfile } from './user';

describe('profile error handling', () => {
  afterEach(() => jest.restoreAllMocks());
  it('returns null only for a confirmed 404', async () => {
    jest.spyOn(api, 'get').mockRejectedValue(new ApiError('Not found', 404));
    await expect(getUserProfile('original-user')).resolves.toBeNull();
  });
  it.each([new Error('Network failed'), new ApiError('Unavailable', 503), new ApiError('Unauthorized', 401)])('does not turn a request failure into a missing identity', async (error) => {
    jest.spyOn(api, 'get').mockRejectedValue(error);
    await expect(getUserProfile('original-user')).rejects.toBe(error);
  });
});
