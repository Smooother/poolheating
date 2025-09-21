// API Client with authentication
class ApiClient {
  private apiKey: string | null = null;

  constructor() {
    // Load API key from localStorage or environment
    this.apiKey = localStorage.getItem('api_key') || process.env.VITE_API_KEY || null;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    localStorage.setItem('api_key', apiKey);
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    return headers;
  }

  async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    // In development mode, mock the API responses
    if (import.meta.env.DEV) {
      return this.mockApiResponse(url, options);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // API key is invalid or missing
      throw new Error('Unauthorized: Invalid or missing API key');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async mockApiResponse<T>(url: string, options: RequestInit): Promise<T> {
    // Mock responses for development
    if (url === '/api/health') {
      return { status: 'ok', timestamp: new Date().toISOString() } as T;
    }
    
    if (url === '/api/status') {
      return {
        heatPump: {
          power_status: 'on',
          target_temp: 25,
          water_temp: 22,
          speed_percentage: 50,
          online: true
        },
        automation: {
          enabled: true,
          target_pool_temp: 25
        },
        currentPrice: {
          price: 0.45,
          area: 'SE3'
        }
      } as T;
    }

    // Default mock response
    return { success: true, message: 'Development mode - API not available' } as T;
  }

  // Specific API methods
  async getStatus() {
    return this.request('/api/status');
  }

  async override(action: string, value?: any) {
    return this.request('/api/override', {
      method: 'POST',
      body: JSON.stringify({ action, value }),
    });
  }

  async getSettings() {
    return this.request('/api/settings');
  }

  async updateSettings(settings: any) {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async getPrices(zone?: string, hours?: number) {
    const params = new URLSearchParams();
    if (zone) params.append('zone', zone);
    if (hours) params.append('hours', hours.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/api/prices?${queryString}` : '/api/prices';
    
    return this.request(url);
  }

  async collectPrices(zone?: string) {
    return this.request('/api/prices', {
      method: 'POST',
      body: JSON.stringify({ zone }),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
