import { apiFetch } from './client';

export const fetchGoals  = ()         => apiFetch('/goals/');
export const createGoal  = (data)     => apiFetch('/goals/',        { method: 'POST',   body: JSON.stringify(data) });
export const updateGoal  = (id, data) => apiFetch(`/goals/${id}`,   { method: 'PUT',    body: JSON.stringify(data) });
export const deleteGoal  = (id)       => apiFetch(`/goals/${id}`,   { method: 'DELETE' });

export const fetchEmis   = ()         => apiFetch('/goals/emis');
export const createEmi   = (data)     => apiFetch('/goals/emis',        { method: 'POST',   body: JSON.stringify(data) });
export const updateEmi   = (id, data) => apiFetch(`/goals/emis/${id}`,  { method: 'PUT',    body: JSON.stringify(data) });
export const deleteEmi   = (id)       => apiFetch(`/goals/emis/${id}`,  { method: 'DELETE' });
