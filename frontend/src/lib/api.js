const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('coc_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  auth: {
    signUp: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    signIn: (body) => request('/auth/signin', { method: 'POST', body: JSON.stringify(body) }),
    getProfile: () => request('/auth/profile'),
  },
  cases: {
    list: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/cases${q ? `?${q}` : ''}`); },
    get: (id) => request(`/cases/${id}`),
    create: (body) => request('/cases', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  evidence: {
    list: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/evidence${q ? `?${q}` : ''}`); },
    get: (id) => request(`/evidence/${id}`),
    create: (body) => request('/evidence', { method: 'POST', body: JSON.stringify(body) }),
    updateStatus: (id, status) => request(`/evidence/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  audit: {
    list: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/audit${q ? `?${q}` : ''}`); },
  },
  compliance: {
    get: () => request('/compliance'),
  },
};
