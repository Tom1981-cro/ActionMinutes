import { API_BASE_URL } from './config';
import { getTokens, setTokens, clearTokens } from './auth';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  public readonly baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];
  private pendingRequests: Promise<any>[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private async refreshToken(): Promise<string | null> {
    const tokens = await getTokens();
    if (!tokens?.refreshToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) {
        await clearTokens();
        return null;
      }

      const data = await response.json();
      await setTokens(data.accessToken, tokens.refreshToken);
      return data.accessToken;
    } catch {
      await clearTokens();
      return null;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const tokens = await getTokens();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    try {
      let response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401 && tokens?.refreshToken) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          const newToken = await this.refreshToken();
          this.isRefreshing = false;

          if (newToken) {
            this.onRefreshed(newToken);
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(`${this.baseUrl}${endpoint}`, {
              ...options,
              headers,
            });
          } else {
            return { error: 'Session expired. Please log in again.' };
          }
        } else {
          return new Promise((resolve) => {
            this.subscribeTokenRefresh((token) => {
              headers['Authorization'] = `Bearer ${token}`;
              fetch(`${this.baseUrl}${endpoint}`, { ...options, headers })
                .then((res) => res.json())
                .then((data) => resolve({ data }))
                .catch((err) => resolve({ error: err.message }));
            });
          });
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.message || `Request failed: ${response.status}` };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(endpoint: string, file: { uri: string; name: string; type: string }) {
    const tokens = await getTokens();
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: tokens?.accessToken ? `Bearer ${tokens.accessToken}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.message || 'Upload failed' };
      }

      const data = await response.json();
      return { data } as ApiResponse<T>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Upload error' };
    }
  }
}

export const api = new ApiClient(API_BASE_URL);
