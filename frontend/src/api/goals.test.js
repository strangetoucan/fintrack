import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './client';
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  fetchEmis,
  createEmi,
  updateEmi,
  deleteEmi,
} from './goals';

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue([]);
});

// ── Goals ─────────────────────────────────────────────────────────────────────

describe('fetchGoals', () => {
  it('calls GET /goals/', async () => {
    await fetchGoals();
    expect(apiFetch).toHaveBeenCalledWith('/goals/');
  });
});

describe('createGoal', () => {
  it('calls POST /goals/ with JSON body', async () => {
    const data = { name: 'Emergency Fund', target: 100000, current: 0 };
    await createGoal(data);
    expect(apiFetch).toHaveBeenCalledWith('/goals/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  });
});

describe('updateGoal', () => {
  it('calls PUT /goals/:id with JSON body', async () => {
    const data = { current: 25000 };
    await updateGoal(1, data);
    expect(apiFetch).toHaveBeenCalledWith('/goals/1', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });
});

describe('deleteGoal', () => {
  it('calls DELETE /goals/:id', async () => {
    await deleteGoal(2);
    expect(apiFetch).toHaveBeenCalledWith('/goals/2', { method: 'DELETE' });
  });
});

// ── EMIs ──────────────────────────────────────────────────────────────────────

describe('fetchEmis', () => {
  it('calls GET /goals/emis', async () => {
    await fetchEmis();
    expect(apiFetch).toHaveBeenCalledWith('/goals/emis');
  });
});

describe('createEmi', () => {
  it('calls POST /goals/emis with JSON body', async () => {
    const data = { name: 'Car Loan', emi: 15000, months_remaining: 24 };
    await createEmi(data);
    expect(apiFetch).toHaveBeenCalledWith('/goals/emis', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  });
});

describe('updateEmi', () => {
  it('calls PUT /goals/emis/:id with JSON body', async () => {
    const data = { months_remaining: 20 };
    await updateEmi(5, data);
    expect(apiFetch).toHaveBeenCalledWith('/goals/emis/5', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });
});

describe('deleteEmi', () => {
  it('calls DELETE /goals/emis/:id', async () => {
    await deleteEmi(3);
    expect(apiFetch).toHaveBeenCalledWith('/goals/emis/3', { method: 'DELETE' });
  });
});
