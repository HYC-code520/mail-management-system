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
      'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning for API requests
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
  async post(endpoint: string, data: Record<string, unknown>) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint: string, data: Record<string, unknown>) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint: string, data: Record<string, unknown>) {
    return this.request(endpoint, {
      method: 'PATCH',
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
    create: (data: Record<string, unknown>) => apiClient.post('/contacts', data),
    update: (id: string, data: Record<string, unknown>) => apiClient.put(`/contacts/${id}`, data),
    delete: (id: string) => apiClient.delete(`/contacts/${id}`),
  },
  mailItems: {
    getAll: (contactId?: string) => apiClient.get(`/mail-items${contactId ? `?contact_id=${contactId}` : ''}`),
    create: (data: Record<string, unknown>) => apiClient.post('/mail-items', data),
    update: (id: string, data: Record<string, unknown>) => apiClient.put(`/mail-items/${id}`, data),
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
    create: (data: Record<string, unknown>) => apiClient.post('/outreach-messages', data),
  },
  templates: {
    getAll: () => apiClient.get('/templates'),
    create: (data: Record<string, unknown>) => apiClient.post('/templates', data),
    update: (id: string, data: Record<string, unknown>) => apiClient.put(`/templates/${id}`, data),
    delete: (id: string) => apiClient.delete(`/templates/${id}`),
  },
  notifications: {
    getByMailItem: (mailItemId: string) => apiClient.get(`/notifications/mail-item/${mailItemId}`),
    getByContact: (contactId: string) => apiClient.get(`/notifications/contact/${contactId}`),
    create: (data: Record<string, unknown>) => apiClient.post('/notifications', data),
    quickNotify: (data: Record<string, unknown>) => apiClient.post('/notifications/quick-notify', data),
  },
  actionHistory: {
    getByMailItem: (mailItemId: string) => apiClient.get(`/action-history/${mailItemId}`),
    create: (data: Record<string, unknown>) => apiClient.post('/action-history', data),
    createBulk: (actions: Record<string, unknown>[]) => apiClient.post('/action-history/bulk', { actions }),
  },
  emails: {
    sendWithTemplate: (data: {
      contact_id: string;
      template_id: string;
      mail_item_id?: string;
      message_type?: string;
      custom_variables?: Record<string, string>;
    }) => apiClient.post('/emails/send', data),
    sendCustom: (data: {
      to: string;
      subject: string;
      body: string;
      contact_id?: string;
      mail_item_id?: string;
    }) => apiClient.post('/emails/send-custom', data),
    test: (testEmail?: string) => apiClient.get(`/emails/test${testEmail ? `?to=${testEmail}` : ''}`),
  },
  oauth: {
    getGmailAuthUrl: () => apiClient.get('/oauth/gmail/auth-url'),
    getGmailStatus: () => apiClient.get('/oauth/gmail/status'),
    disconnectGmail: () => apiClient.post('/oauth/gmail/disconnect', {}),
  },
  todos: {
    getAll: (filters?: { date?: string; completed?: boolean; category?: string }) => {
      const params = new URLSearchParams();
      if (filters?.date) params.append('date', filters.date);
      if (filters?.completed !== undefined) params.append('completed', String(filters.completed));
      if (filters?.category) params.append('category', filters.category);
      return apiClient.get(`/todos${params.toString() ? `?${params}` : ''}`);
    },
    create: (data: {
      title: string;
      notes?: string;
      date_header?: string;
      priority?: number;
      category?: string;
      staff_member?: string;
    }) => apiClient.post('/todos', data),
    update: (id: string, data: {
      title?: string;
      notes?: string;
      is_completed?: boolean;
      date_header?: string;
      priority?: number;
      category?: string;
      sort_order?: number;
      staff_member?: string;
    }) => apiClient.put(`/todos/${id}`, data),
    delete: (id: string) => apiClient.delete(`/todos/${id}`),
    bulkUpdate: (todos: Array<{ todo_id: string; sort_order?: number; is_completed?: boolean }>) => 
      apiClient.patch('/todos/bulk', { todos }),
  },

  scan: {
    bulkSubmit: (items: Array<{
      contact_id: string;
      item_type: 'Letter' | 'Package';
      scanned_at: string;
    }>) => 
      apiClient.post('/scan/bulk-submit', { items }),
    
    smartMatch: (data: {
      image: string;
      mimeType: string;
      contacts: Array<{
        contact_id: string;
        contact_person?: string;
        company_name?: string;
        mailbox_number?: string;
      }>;
    }) =>
      apiClient.post('/scan/smart-match', data),
  },

  stats: {
    getDashboardStats: (timeRange: 7 | 14 | 30 = 7) => apiClient.get(`/stats/dashboard?timeRange=${timeRange}`),
  },
};

