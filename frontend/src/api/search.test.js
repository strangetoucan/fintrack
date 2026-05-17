import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './client';
import { globalSearch } from './search';

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue([]);
});

describe('globalSearch', () => {
  it('calls GET /search/ with encoded q param', async () => {
    await globalSearch('netflix');
    expect(apiFetch).toHaveBeenCalledWith('/search/?q=netflix');
  });

  it('URL-encodes special characters in the query', async () => {
    await globalSearch('food & dining');
    expect(apiFetch).toHaveBeenCalledWith('/search/?q=food%20%26%20dining');
  });

  it('URL-encodes unicode characters', async () => {
    await globalSearch('₹500');
    expect(apiFetch).toHaveBeenCalledWith('/search/?q=%E2%82%B9500');
  });

  it('returns the result from apiFetch', async () => {
    const results = [{ type: 'transaction', id: 1, title: 'Netflix' }];
    apiFetch.mockResolvedValue(results);
    const data = await globalSearch('netflix');
    expect(data).toEqual(results);
  });
});
