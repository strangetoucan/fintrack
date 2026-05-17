import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './client';
import {
  fetchInvestments,
  fetchInvestmentSummary,
  fetchInvestmentTransactions,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from './investments';

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue([]);
});

describe('fetchInvestments', () => {
  it('calls GET /investments/ with no type filter', async () => {
    await fetchInvestments();
    expect(apiFetch).toHaveBeenCalledWith('/investments/');
  });

  it('appends type query param when provided', async () => {
    await fetchInvestments('MF');
    expect(apiFetch).toHaveBeenCalledWith('/investments/?type=MF');
  });

  it('calls without type param when type is falsy', async () => {
    await fetchInvestments(null);
    expect(apiFetch).toHaveBeenCalledWith('/investments/');
  });
});

describe('fetchInvestmentSummary', () => {
  it('calls GET /investments/summary', async () => {
    await fetchInvestmentSummary();
    expect(apiFetch).toHaveBeenCalledWith('/investments/summary');
  });
});

describe('fetchInvestmentTransactions', () => {
  it('calls GET /investments/:id/transactions', async () => {
    await fetchInvestmentTransactions(10);
    expect(apiFetch).toHaveBeenCalledWith('/investments/10/transactions');
  });
});

describe('createInvestment', () => {
  it('calls POST /investments/ with JSON body', async () => {
    const data = { name: 'HDFC MF', type: 'MF', platform: 'Zerodha', invested: 10000, current: 11000 };
    await createInvestment(data);
    expect(apiFetch).toHaveBeenCalledWith('/investments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  });
});

describe('updateInvestment', () => {
  it('calls PUT /investments/:id with JSON body', async () => {
    const data = { current: 12000 };
    await updateInvestment(4, data);
    expect(apiFetch).toHaveBeenCalledWith('/investments/4', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });
});

describe('deleteInvestment', () => {
  it('calls DELETE /investments/:id', async () => {
    await deleteInvestment(6);
    expect(apiFetch).toHaveBeenCalledWith('/investments/6', { method: 'DELETE' });
  });
});
