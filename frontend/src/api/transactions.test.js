import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './client';
import {
  fetchTransactions,
  updateTransaction,
  createTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
} from './transactions';

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue([]);
});

// ── fetchTransactions ─────────────────────────────────────────────────────────

describe('fetchTransactions', () => {
  it('calls GET /transactions/ with no filters', async () => {
    await fetchTransactions();
    expect(apiFetch).toHaveBeenCalledWith('/transactions/');
  });

  it('appends type filter', async () => {
    await fetchTransactions({ type: 'expense' });
    expect(apiFetch).toHaveBeenCalledWith('/transactions/?type=expense');
  });

  it('appends search filter', async () => {
    await fetchTransactions({ search: 'amazon' });
    expect(apiFetch).toHaveBeenCalledWith('/transactions/?search=amazon');
  });

  it('appends category filter', async () => {
    await fetchTransactions({ category: 'Food' });
    expect(apiFetch).toHaveBeenCalledWith('/transactions/?category=Food');
  });

  it('appends date_from filter', async () => {
    await fetchTransactions({ date_from: '2025-01-01' });
    expect(apiFetch).toHaveBeenCalledWith('/transactions/?date_from=2025-01-01');
  });

  it('appends date_to filter', async () => {
    await fetchTransactions({ date_to: '2025-12-31' });
    expect(apiFetch).toHaveBeenCalledWith('/transactions/?date_to=2025-12-31');
  });

  it('appends tag filter', async () => {
    await fetchTransactions({ tag: 'groceries' });
    expect(apiFetch).toHaveBeenCalledWith('/transactions/?tag=groceries');
  });

  it('appends limit filter', async () => {
    await fetchTransactions({ limit: 50 });
    expect(apiFetch).toHaveBeenCalledWith('/transactions/?limit=50');
  });

  it('combines multiple filters', async () => {
    await fetchTransactions({ type: 'expense', search: 'coffee', limit: 10 });
    const [url] = apiFetch.mock.calls[0];
    expect(url).toContain('type=expense');
    expect(url).toContain('search=coffee');
    expect(url).toContain('limit=10');
    expect(url).toMatch(/^\/transactions\/\?/);
  });

  it('omits falsy filter values', async () => {
    await fetchTransactions({ type: '', search: null, category: undefined });
    expect(apiFetch).toHaveBeenCalledWith('/transactions/');
  });
});

// ── createTransaction ─────────────────────────────────────────────────────────

describe('createTransaction', () => {
  it('calls POST /transactions/ with JSON body', async () => {
    const data = { date: '2025-06-01', desc: 'Coffee', category: 'Food', amount: -150, type: 'expense' };
    await createTransaction(data);
    expect(apiFetch).toHaveBeenCalledWith('/transactions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  });
});

// ── updateTransaction ─────────────────────────────────────────────────────────

describe('updateTransaction', () => {
  it('calls PUT /transactions/:id with JSON body', async () => {
    const data = { amount: -200, desc: 'Dinner' };
    await updateTransaction(5, data);
    expect(apiFetch).toHaveBeenCalledWith('/transactions/5', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });
});

// ── deleteTransaction ─────────────────────────────────────────────────────────

describe('deleteTransaction', () => {
  it('calls DELETE /transactions/:id', async () => {
    await deleteTransaction(12);
    expect(apiFetch).toHaveBeenCalledWith('/transactions/12', { method: 'DELETE' });
  });
});

// ── bulkDeleteTransactions ────────────────────────────────────────────────────

describe('bulkDeleteTransactions', () => {
  it('calls DELETE /transactions/bulk with ids in body', async () => {
    await bulkDeleteTransactions([1, 2, 3]);
    expect(apiFetch).toHaveBeenCalledWith('/transactions/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids: [1, 2, 3] }),
    });
  });

  it('passes empty array without modification', async () => {
    await bulkDeleteTransactions([]);
    expect(apiFetch).toHaveBeenCalledWith('/transactions/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids: [] }),
    });
  });
});
