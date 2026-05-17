import { apiFetch } from './client';

export const fetchBudget              = ()           => apiFetch('/budget/');
export const fetchBudgetSummary       = ()           => apiFetch('/budget/summary');
export const fetchBudgetVsActual      = (month)      => apiFetch(`/budget/vs-actual${month ? `?month=${month}` : ''}`);
export const createBudgetCategory     = (data)       => apiFetch('/budget/', { method: 'POST', body: JSON.stringify(data) });
export const updateBudgetCategory     = (id, data)   => apiFetch(`/budget/${id}`, { method: 'PUT',  body: JSON.stringify(data) });
export const deleteBudgetCategory     = (id)         => apiFetch(`/budget/${id}`, { method: 'DELETE' });
