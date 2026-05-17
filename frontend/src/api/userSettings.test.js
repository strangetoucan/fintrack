import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './client';
import { fetchSettings, saveSettings } from './userSettings';

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue({});
});

describe('fetchSettings', () => {
  it('calls GET /settings/', async () => {
    await fetchSettings();
    expect(apiFetch).toHaveBeenCalledWith('/settings/');
  });

  it('returns the result from apiFetch', async () => {
    const settings = { user_name: 'Tushar', palette: 'indigo' };
    apiFetch.mockResolvedValue(settings);
    const data = await fetchSettings();
    expect(data).toEqual(settings);
  });
});

describe('saveSettings', () => {
  it('calls PUT /settings/ with JSON body', async () => {
    const data = { palette: 'emerald', density: 'compact' };
    await saveSettings(data);
    expect(apiFetch).toHaveBeenCalledWith('/settings/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });

  it('returns the updated settings from apiFetch', async () => {
    const updated = { user_name: 'Alice', palette: 'rose' };
    apiFetch.mockResolvedValue(updated);
    const data = await saveSettings({ palette: 'rose' });
    expect(data).toEqual(updated);
  });
});
