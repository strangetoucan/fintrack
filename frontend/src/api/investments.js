import { apiFetch } from './client';

export const fetchInvestments            = (type)       => apiFetch(`/investments/${type ? `?type=${type}` : ''}`);
export const fetchInvestmentSummary      = ()           => apiFetch('/investments/summary');
export const fetchInvestmentTransactions = (id)         => apiFetch(`/investments/${id}/transactions`);
export const createInvestment            = (data)       => apiFetch('/investments/', { method: 'POST', body: JSON.stringify(data) });
export const updateInvestment            = (id, data)   => apiFetch(`/investments/${id}`, { method: 'PUT',  body: JSON.stringify(data) });
export const deleteInvestment            = (id)         => apiFetch(`/investments/${id}`, { method: 'DELETE' });
