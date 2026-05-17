import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './client';
import {
  fetchBudget,
  fetchBudgetSummary,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
} from './budget';

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue([]);
});

describe('fetchBudget', () => {
  it('calls GET /budget/', async () => {
    await fetchBudget();
    expect(apiFetch).toHaveBeenCalledWith('/budget/');
  });
});

describe('fetchBudgetSummary', () => {
  it('calls GET /budget/summary', async () => {
    await fetchBudgetSummary();
    expect(apiFetch).toHaveBeenCalledWith('/budget/summary');
  });
});

describe('createBudgetCategory', () => {
  it('calls POST /budget/ with JSON body', async () => {
    const data = { name: 'Food', limit: 10000 };
    await createBudgetCategory(data);
    expect(apiFetch).toHaveBeenCalledWith('/budget/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  });
});

describe('updateBudgetCategory', () => {
  it('calls PUT /budget/:id with JSON body', async () => {
    const data = { limit: 15000 };
    await updateBudgetCategory(3, data);
    expect(apiFetch).toHaveBeenCalledWith('/budget/3', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });
});

describe('deleteBudgetCategory', () => {
  it('calls DELETE /budget/:id', async () => {
    await deleteBudgetCategory(5);
    expect(apiFetch).toHaveBeenCalledWith('/budget/5', { method: 'DELETE' });
  });
});
