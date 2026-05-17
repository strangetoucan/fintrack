import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './client';
import {
  fetchAccounts,
  fetchAccountSummary,
  createAccount,
  updateAccount,
  deleteAccount,
} from './accounts';

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue([]);
});

describe('fetchAccounts', () => {
  it('calls GET /accounts/', async () => {
    await fetchAccounts();
    expect(apiFetch).toHaveBeenCalledWith('/accounts/');
  });
});

describe('fetchAccountSummary', () => {
  it('calls GET /accounts/summary', async () => {
    await fetchAccountSummary();
    expect(apiFetch).toHaveBeenCalledWith('/accounts/summary');
  });
});

describe('createAccount', () => {
  it('calls POST /accounts/ with JSON body', async () => {
    const data = { name: 'Savings', bank_name: 'HDFC', account_type: 'savings', balance: 50000 };
    await createAccount(data);
    expect(apiFetch).toHaveBeenCalledWith('/accounts/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  });
});

describe('updateAccount', () => {
  it('calls PUT /accounts/:id with JSON body', async () => {
    const data = { balance: 75000 };
    await updateAccount(42, data);
    expect(apiFetch).toHaveBeenCalledWith('/accounts/42', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });
});

describe('deleteAccount', () => {
  it('calls DELETE /accounts/:id', async () => {
    await deleteAccount(7);
    expect(apiFetch).toHaveBeenCalledWith('/accounts/7', { method: 'DELETE' });
  });
});
