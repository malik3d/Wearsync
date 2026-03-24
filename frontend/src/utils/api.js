const BASE = '/api';

export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  devices:       ()           => apiFetch('/devices'),
  today:         ()           => apiFetch('/metrics/today'),
  range:         (from, to, devices) => apiFetch(`/metrics/range?from=${from}&to=${to}${devices ? `&devices=${devices}` : ''}`),
  compare:       (metric, from, to) => apiFetch(`/metrics/compare?metric=${metric}&from=${from}&to=${to}`),
  syncAll:       (date)       => apiFetch('/sync', { method: 'POST', body: JSON.stringify({ date }) }),
  syncDevice:    (provider, date) => apiFetch(`/sync/${provider}`, { method: 'POST', body: JSON.stringify({ date }) }),
  exportCSV:     (from, to)   => `${BASE}/export/csv?from=${from}&to=${to}`,
  exportJSON:    (from, to)   => `${BASE}/export/json?from=${from}&to=${to}`,
  connectDevice: (provider)   => { window.location.href = `${BASE}/auth/${provider}`; },
  disconnect:    (provider)   => apiFetch(`/devices/${provider}`, { method: 'DELETE' }),
};
