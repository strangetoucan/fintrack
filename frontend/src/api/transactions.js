import { apiFetch } from './client';

export function fetchTransactions({ type, search, category, date_from, date_to, tag, limit } = {}) {
  const params = new URLSearchParams();
  if (type)      params.set('type', type);
  if (search)    params.set('search', search);
  if (category)  params.set('category', category);
  if (date_from) params.set('date_from', date_from);
  if (date_to)   params.set('date_to', date_to);
  if (tag)       params.set('tag', tag);
  if (limit)     params.set('limit', limit);
  const qs = params.toString();
  return apiFetch(`/transactions/${qs ? '?' + qs : ''}`);
}

export function updateTransaction(id, data) {
  return apiFetch(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
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

export function bulkDeleteTransactions(ids) {
  return apiFetch('/transactions/bulk', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
}
