import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './client';
import {
  fetchSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from './subscriptions';

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue([]);
});

describe('fetchSubscriptions', () => {
  it('calls GET /subscriptions', async () => {
    await fetchSubscriptions();
    expect(apiFetch).toHaveBeenCalledWith('/subscriptions');
  });
});

describe('createSubscription', () => {
  it('calls POST /subscriptions with JSON body', async () => {
    const body = { name: 'Netflix', amount: 799, billing_cycle: 'monthly', category: 'Entertainment' };
    await createSubscription(body);
    expect(apiFetch).toHaveBeenCalledWith('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });
});

describe('updateSubscription', () => {
  it('calls PUT /subscriptions/:id with JSON body', async () => {
    const body = { amount: 899, status: 'paused' };
    await updateSubscription(3, body);
    expect(apiFetch).toHaveBeenCalledWith('/subscriptions/3', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  });
});

describe('deleteSubscription', () => {
  it('calls DELETE /subscriptions/:id', async () => {
    await deleteSubscription(9);
    expect(apiFetch).toHaveBeenCalledWith('/subscriptions/9', { method: 'DELETE' });
  });
});
