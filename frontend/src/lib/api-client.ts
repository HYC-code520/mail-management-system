import { supabase } from './supabase.ts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * API Client for making authenticated requests to the Express backend
 */
class ApiClient {
  /**
   * Get the current user's auth token
   */
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Make an authenticated API request
   */
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    // Handle 204 No Content (common for DELETE requests)
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  /**
   * GET request
   */
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Export individual methods for convenience
export const api = {
  contacts: {
    getAll: () => apiClient.get('/contacts'),
    getById: (id: string) => apiClient.get(`/contacts/${id}`),
    create: (data: any) => apiClient.post('/contacts', data),
    update: (id: string, data: any) => apiClient.put(`/contacts/${id}`, data),
    delete: (id: string) => apiClient.delete(`/contacts/${id}`),
  },
  mailItems: {
    getAll: (contactId?: string) => apiClient.get(`/mail-items${contactId ? `?contact_id=${contactId}` : ''}`),
    create: (data: any) => apiClient.post('/mail-items', data),
    update: (id: string, data: any) => apiClient.put(`/mail-items/${id}`, data),
    updateStatus: (id: string, status: string) => apiClient.put(`/mail-items/${id}`, { status }),
    delete: (id: string) => apiClient.delete(`/mail-items/${id}`),
  },
  outreachMessages: {
    getAll: (contactId?: string, mailItemId?: string) => {
      const params = new URLSearchParams();
      if (contactId) params.append('contact_id', contactId);
      if (mailItemId) params.append('mail_item_id', mailItemId);
      return apiClient.get(`/outreach-messages${params.toString() ? `?${params}` : ''}`);
    },
    create: (data: any) => apiClient.post('/outreach-messages', data),
  },
  templates: {
    getAll: () => apiClient.get('/templates'),
    create: (data: any) => apiClient.post('/templates', data),
    update: (id: string, data: any) => apiClient.put(`/templates/${id}`, data),
    delete: (id: string) => apiClient.delete(`/templates/${id}`),
  },
};

