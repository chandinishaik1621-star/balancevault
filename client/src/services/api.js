const API_BASE = '/api';

export const api = {
  getToken: () => localStorage.getItem('bv_token'),
  setToken: (token) => localStorage.setItem('bv_token', token),
  clearToken: () => localStorage.removeItem('bv_token'),

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && endpoint !== '/auth/login') {
          this.clearToken();
          window.dispatchEvent(new Event('auth-expired'));
        }
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  // Auth Endpoints
  register: (body) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => api.request('/auth/me'),

  // Onboarding Endpoints
  submitOnboarding: (body) => api.request('/onboarding/submit', { method: 'POST', body: JSON.stringify(body) }),
  getOnboardingStatus: () => api.request('/onboarding/my-status'),

  // Accounts & Ledger
  getAccounts: (all = false) => api.request(`/accounts${all ? '?all=true' : ''}`),
  getAccount: (id) => api.request(`/accounts/${id}`),
  getLedger: (id) => api.request(`/accounts/${id}/ledger`),
  verifyLedger: (id) => api.request(`/accounts/${id}/verify-ledger`),

  // Transactions
  transfer: (body, idempotencyKey) =>
    api.request('/transactions/transfer', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(body)
    }),
  deposit: (body) => api.request('/transactions/deposit', { method: 'POST', body: JSON.stringify(body) }),
  getTransactions: (all = false) => api.request(`/transactions/history${all ? '?all=true' : ''}`),

  // Admin Endpoints
  getBootstrapStatus: () => api.request('/admin/bootstrap-status'),
  bootstrapAdmin: (body) => api.request('/admin/bootstrap', { method: 'POST', body: JSON.stringify(body) }),
  getAdminStats: () => api.request('/admin/stats'),
  getAdminUsers: () => api.request('/admin/users'),
  updateUserRole: (id, role) => api.request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  updateUserStatus: (id, status) => api.request(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getAdminOnboarding: () => api.request('/admin/onboarding'),
  reviewOnboarding: (id, decision, notes) =>
    api.request(`/admin/onboarding/${id}/review`, { method: 'PATCH', body: JSON.stringify({ decision, notes }) }),

  // Audit
  getAuditLogs: (params = '') => api.request(`/audit/logs${params}`),
  verifyAuditIntegrity: () => api.request('/audit/verify'),

  // System
  getHealth: () => fetch('/health').then((r) => r.json()),
  getReady: () => fetch('/ready').then((r) => r.json())
};

