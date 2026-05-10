const BASE = '/api';

export async function apiFetch(path, options = {}) {
  const { headers: callerHeaders, ...rest } = options;
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...callerHeaders },
    ...rest,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
