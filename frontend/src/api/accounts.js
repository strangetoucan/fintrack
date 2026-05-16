import { apiFetch } from './client';

export const fetchAccounts       = ()          => apiFetch('/accounts/');
export const fetchAccountSummary = ()          => apiFetch('/accounts/summary');
export const createAccount       = (data)      => apiFetch('/accounts/', { method: 'POST', body: JSON.stringify(data) });
export const updateAccount       = (id, data)  => apiFetch(`/accounts/${id}`, { method: 'PUT',  body: JSON.stringify(data) });
export const deleteAccount       = (id)        => apiFetch(`/accounts/${id}`, { method: 'DELETE' });
