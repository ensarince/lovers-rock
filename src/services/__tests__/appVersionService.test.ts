jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.1.0' } },
}));

import { compareVersions, getAvailableUpdate } from '@/src/services/appVersionService';

const mockFetch = (impl: any) => {
  (global as any).fetch = jest.fn(impl);
};

afterEach(() => {
  delete (global as any).fetch;
});

describe('compareVersions', () => {
  it('compares number by number, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.2')).toBe(1);
    expect(compareVersions('1.9.2', '1.10.0')).toBe(-1);
  });

  it('treats missing parts as zero', () => {
    expect(compareVersions('1.1', '1.1.0')).toBe(0);
    expect(compareVersions('1.1.1', '1.1')).toBe(1);
  });

  it('says equal for the same version', () => {
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });
});

describe('getAvailableUpdate', () => {
  const serverSays = (latest: any) =>
    mockFetch(async () => ({ ok: true, json: async () => ({ android: { latest } }) }));

  it('returns the store version when it is newer', async () => {
    serverSays('1.2.0');
    expect(await getAvailableUpdate()).toBe('1.2.0');
  });

  it('returns null when already up to date', async () => {
    serverSays('1.1.0');
    expect(await getAvailableUpdate()).toBeNull();
  });

  it('returns null when this build is ahead of the store (rollout in progress)', async () => {
    serverSays('1.0.0');
    expect(await getAvailableUpdate()).toBeNull();
  });

  it('returns null when the server could not read the store', async () => {
    serverSays(null);
    expect(await getAvailableUpdate()).toBeNull();
  });

  it('never throws when offline', async () => {
    mockFetch(async () => {
      throw new Error('offline');
    });
    expect(await getAvailableUpdate()).toBeNull();
  });
});
