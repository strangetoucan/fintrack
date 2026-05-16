import { apiFetch } from './client';

export const fetchRecurring   = ()          => apiFetch('/recurring/');
export const createRecurring  = (data)      => apiFetch('/recurring/', { method: 'POST', body: JSON.stringify(data) });
export const updateRecurring  = (id, data)  => apiFetch(`/recurring/${id}`, { method: 'PUT',  body: JSON.stringify(data) });
export const deleteRecurring  = (id)        => apiFetch(`/recurring/${id}`, { method: 'DELETE' });
