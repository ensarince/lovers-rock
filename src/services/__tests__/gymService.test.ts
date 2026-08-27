import { getGymSuggestions } from '@/src/services/gymService';

const TOKEN = 'test-token';

const mockFetch = (impl: any) => {
  (global as any).fetch = jest.fn(impl);
};

afterEach(() => {
  delete (global as any).fetch;
});

describe('getGymSuggestions', () => {
  it('returns the suggestions the server sent', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => ({ items: [{ name: 'Boulderwerk', count: 12 }] }),
    }));

    expect(await getGymSuggestions('boul', TOKEN)).toEqual([
      { name: 'Boulderwerk', count: 12 },
    ]);
  });

  it('sends the query url-encoded', async () => {
    const fetchSpy = jest.fn(async (_url: string, _init?: any) => ({
      ok: true,
      json: async () => ({ items: [] }),
    }));
    mockFetch(fetchSpy);

    await getGymSuggestions('Berta Block & Co', TOKEN);

    expect(fetchSpy.mock.calls[0][0]).toContain('q=Berta%20Block%20%26%20Co');
  });

  it('trims the query so a stray space is not treated as a search', async () => {
    const fetchSpy = jest.fn(async (_url: string, _init?: any) => ({
      ok: true,
      json: async () => ({ items: [] }),
    }));
    mockFetch(fetchSpy);

    await getGymSuggestions('  ', TOKEN);

    expect(fetchSpy.mock.calls[0][0]).toContain('q=');
    expect(fetchSpy.mock.calls[0][0]).not.toContain('%20');
  });

  it('authenticates the request', async () => {
    const fetchSpy = jest.fn(async (_url: string, _init?: any) => ({
      ok: true,
      json: async () => ({ items: [] }),
    }));
    mockFetch(fetchSpy);

    await getGymSuggestions('bw', TOKEN);

    expect(fetchSpy.mock.calls[0][1]?.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  // Suggestions are a convenience. Every failure path has to degrade to a plain
  // text field rather than surfacing an error to someone editing their profile.
  describe('degrading quietly', () => {
    it('returns empty without a token, and does not call the server', async () => {
      const fetchSpy = jest.fn(async (_url: string, _init?: any) => ({
        ok: true,
        json: async () => ({ items: [] }),
      }));
      mockFetch(fetchSpy);

      expect(await getGymSuggestions('bw', '')).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns empty when the server errors', async () => {
      mockFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
      expect(await getGymSuggestions('bw', TOKEN)).toEqual([]);
    });

    it('returns empty when the network throws', async () => {
      mockFetch(async () => { throw new Error('offline'); });
      expect(await getGymSuggestions('bw', TOKEN)).toEqual([]);
    });

    it('returns empty when the payload is not shaped as expected', async () => {
      mockFetch(async () => ({ ok: true, json: async () => ({ items: 'nope' }) }));
      expect(await getGymSuggestions('bw', TOKEN)).toEqual([]);
    });

    it('returns empty when the body is not JSON at all', async () => {
      mockFetch(async () => ({ ok: true, json: async () => { throw new Error('bad json'); } }));
      expect(await getGymSuggestions('bw', TOKEN)).toEqual([]);
    });
  });
});
