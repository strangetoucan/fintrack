import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './client';
import {
  fetchRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from './recurring';

beforeEach(() => {
  vi.clearAllMocks();
  apiFetch.mockResolvedValue([]);
});

describe('fetchRecurring', () => {
  it('calls GET /recurring/', async () => {
    await fetchRecurring();
    expect(apiFetch).toHaveBeenCalledWith('/recurring/');
  });
});

describe('createRecurring', () => {
  it('calls POST /recurring/ with JSON body', async () => {
    const data = { desc: 'Netflix', category: 'Entertainment', amount: 799, type: 'expense', day_of_month: 5 };
    await createRecurring(data);
    expect(apiFetch).toHaveBeenCalledWith('/recurring/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  });
});

describe('updateRecurring', () => {
  it('calls PUT /recurring/:id with JSON body', async () => {
    const data = { amount: 999, active: false };
    await updateRecurring(8, data);
    expect(apiFetch).toHaveBeenCalledWith('/recurring/8', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });
});

describe('deleteRecurring', () => {
  it('calls DELETE /recurring/:id', async () => {
    await deleteRecurring(11);
    expect(apiFetch).toHaveBeenCalledWith('/recurring/11', { method: 'DELETE' });
  });
});
