import { apiFetch } from './client';

export const fetchSubscriptions   = ()        => apiFetch('/subscriptions');
export const createSubscription   = (body)    => apiFetch('/subscriptions',     { method: 'POST',   body: JSON.stringify(body) });
export const updateSubscription   = (id, body) => apiFetch(`/subscriptions/${id}`, { method: 'PUT',    body: JSON.stringify(body) });
export const deleteSubscription   = (id)      => apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });
