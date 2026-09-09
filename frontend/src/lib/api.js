const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let memoryToken = null;

export function setAuthToken(token) {
  memoryToken = token;
}

export function getAuthToken() {
  return memoryToken;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  
  // Prefer in-memory token, fallback to cookies (credentials: 'include')
  if (memoryToken) {
    headers.Authorization = `Bearer ${memoryToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Automatically sends and receives HttpOnly cookies
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || data.error || 'Request failed';
    const err = new Error(message);
    err.status = response.status;
    err.code = data.error?.code;
    throw err;
  }
  return data;
}

export const api = {
  auth: {
    requestAccess: (body) => request('/auth/request-access', { method: 'POST', body: JSON.stringify(body) }),
    signUp: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    signIn: (body) => request('/auth/signin', { method: 'POST', body: JSON.stringify(body) }),
    refreshToken: () => request('/auth/refresh', { method: 'POST' }),
    signOut: () => request('/auth/signout', { method: 'POST' }),
    getProfile: () => request('/auth/profile'),
  },
  cases: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/cases${q ? `?${q}` : ''}`);
    },
    get: (id) => request(`/cases/${id}`),
    create: (body) => request('/cases', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  evidence: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/evidence${q ? `?${q}` : ''}`);
    },
    get: (id) => request(`/evidence/${id}`),
    create: (body) => request('/evidence', { method: 'POST', body: JSON.stringify(body) }),
    updateStatus: (id, status) => request(`/evidence/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  audit: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/audit${q ? `?${q}` : ''}`);
    },
  },
  compliance: {
    get: () => request('/compliance'),
  },
  admin: {
    getAccessRequests: () => request('/admin/access-requests'),
    approveAccessRequest: (id, body) => request(`/admin/access-requests/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),
    rejectAccessRequest: (id, body) => request(`/admin/access-requests/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),
    getUsers: () => request('/admin/users'),
    updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    updateUserStatus: (id, status) => request(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
};
