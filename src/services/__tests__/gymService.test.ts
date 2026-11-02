import { getGymMap, getGymSuggestions } from '@/src/services/gymService';

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

describe('getGymMap', () => {
  const bounds = { minLat: 47.1, maxLat: 49.2, minLon: 10.5, maxLon: 12.75 };

  it('sends the visible area and a rounded zoom', async () => {
    const fetchSpy = jest.fn(async (_url: string, _init?: any) => ({
      ok: true,
      json: async () => ({ items: [] }),
    }));
    mockFetch(fetchSpy);

    await getGymMap(bounds, 7.6, TOKEN);

    const url = fetchSpy.mock.calls[0][0];
    expect(url).toContain('/api/gym-map?');
    expect(url).toContain('minLat=47.1000');
    expect(url).toContain('maxLon=12.7500');
    expect(url).toContain('zoom=8');
    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('returns the items the server sent', async () => {
    const items = [
      { type: 'gym', id: 'g1', name: 'Boulderwerk', latitude: 48.1, longitude: 11.5, climbers: 4 },
      { type: 'cluster', id: 'c1', latitude: 48.0, longitude: 11.0, gyms: 3, climbers: 9 },
    ];
    mockFetch(async () => ({ ok: true, json: async () => ({ items }) }));

    expect(await getGymMap(bounds, 8, TOKEN)).toEqual(items);
  });

  it('throws when the server fails, so the screen can offer a retry', async () => {
    mockFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));

    await expect(getGymMap(bounds, 8, TOKEN)).rejects.toThrow('500');
  });
});
