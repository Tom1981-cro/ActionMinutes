import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { setTokens, clearTokens, getTokens } from '../services/auth';
import { useStore, User } from '../store';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export function useAuth() {
  const { user, setUser, setLoading, logout: storeLogout } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${api.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${api.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Registration failed');
      }

      const data: AuthResponse = await response.json();
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    await clearTokens();
    storeLogout();
  }, [storeLogout]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const tokens = await getTokens();
      if (!tokens?.refreshToken) {
        setLoading(false);
        return false;
      }

      const response = await api.post<AuthResponse>('/api/auth/refresh', {
        refreshToken: tokens.refreshToken,
      });

      if (response.error || !response.data) {
        await clearTokens();
        setLoading(false);
        return false;
      }

      await setTokens(response.data.accessToken, tokens.refreshToken);
      setUser(response.data.user);
      setLoading(false);
      return true;
    } catch {
      await clearTokens();
      setLoading(false);
      return false;
    }
  }, [setUser, setLoading]);

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${api.baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Request failed');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshSession,
    forgotPassword,
    clearError: () => setError(null),
  };
}
