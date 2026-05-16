import { apiFetch } from './client';

export const fetchSettings = ()     => apiFetch('/settings/');
export const saveSettings  = (data) => apiFetch('/settings/', { method: 'PUT', body: JSON.stringify(data) });
