import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from './client.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function mockFetch(status, body, headers = {}) {
  const isJson = status !== 204;
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'Content-Type': 'application/json', ...headers }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(200, { id: 1 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── request construction ──────────────────────────────────────────────────────

describe('apiFetch request construction', () => {
  it('prepends /api to the path', async () => {
    await apiFetch('/transactions/');
    const [url] = fetch.mock.calls[0];
    expect(url).toBe('/api/transactions/');
  });

  it('sets Content-Type: application/json by default', async () => {
    await apiFetch('/transactions/');
    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  it('merges caller headers with defaults', async () => {
    await apiFetch('/transactions/', { headers: { Authorization: 'Bearer token' } });
    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.headers['Authorization']).toBe('Bearer token');
  });

  it('passes method and body options through', async () => {
    await apiFetch('/transactions/', { method: 'POST', body: JSON.stringify({ desc: 'x' }) });
    const [, opts] = fetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify({ desc: 'x' }));
  });
});

// ── successful responses ──────────────────────────────────────────────────────

describe('apiFetch success handling', () => {
  it('returns parsed JSON for 200', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { id: 42, name: 'Test' }));
    const data = await apiFetch('/transactions/1');
    expect(data).toEqual({ id: 42, name: 'Test' });
  });

  it('returns parsed JSON for 201', async () => {
    vi.stubGlobal('fetch', mockFetch(201, { id: 1 }));
    const data = await apiFetch('/transactions/', { method: 'POST' });
    expect(data).toEqual({ id: 1 });
  });

  it('returns null for 204 No Content', async () => {
    vi.stubGlobal('fetch', mockFetch(204, null));
    const data = await apiFetch('/transactions/1', { method: 'DELETE' });
    expect(data).toBeNull();
  });
});

// ── error handling ────────────────────────────────────────────────────────────

describe('apiFetch error handling', () => {
  it('throws for 400 Bad Request', async () => {
    vi.stubGlobal('fetch', mockFetch(400, 'Category name already exists'));
    await expect(apiFetch('/budget/')).rejects.toThrow('API 400');
  });

  it('throws for 404 Not Found', async () => {
    vi.stubGlobal('fetch', mockFetch(404, 'Transaction not found'));
    await expect(apiFetch('/transactions/999')).rejects.toThrow('API 404');
  });

  it('throws for 422 Unprocessable Entity', async () => {
    vi.stubGlobal('fetch', mockFetch(422, { detail: 'Validation error' }));
    await expect(apiFetch('/transactions/', { method: 'POST' })).rejects.toThrow('API 422');
  });

  it('throws for 500 Internal Server Error', async () => {
    vi.stubGlobal('fetch', mockFetch(500, 'Internal server error'));
    await expect(apiFetch('/transactions/')).rejects.toThrow('API 500');
  });

  it('error message includes status code', async () => {
    vi.stubGlobal('fetch', mockFetch(404, 'Not found'));
    try {
      await apiFetch('/transactions/999');
    } catch (e) {
      expect(e.message).toMatch(/404/);
    }
  });

  it('handles response.text() failure gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.reject(new Error('body error')),
    }));
    await expect(apiFetch('/transactions/')).rejects.toThrow('API 503');
  });
});
