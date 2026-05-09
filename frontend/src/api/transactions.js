import { apiFetch } from './client';

export function fetchTransactions({ type, search, limit } = {}) {
  const params = new URLSearchParams();
  if (type)   params.set('type', type);
  if (search) params.set('search', search);
  if (limit)  params.set('limit', limit);
  const qs = params.toString();
  return apiFetch(`/transactions/${qs ? '?' + qs : ''}`);
}

export function createTransaction(data) {
  return apiFetch('/transactions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteTransaction(id) {
  return apiFetch(`/transactions/${id}`, { method: 'DELETE' });
}
