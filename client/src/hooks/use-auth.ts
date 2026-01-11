import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import type { User } from "@shared/schema";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!accessToken) {
    const refreshResult = await refreshTokens();
    if (refreshResult) {
      accessToken = refreshResult.accessToken;
    } else {
      throw new Error('Not authenticated. Please log in again.');
    }
  }
  
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    const refreshResult = await refreshTokens();
    if (refreshResult) {
      accessToken = refreshResult.accessToken;
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set("Authorization", `Bearer ${accessToken}`);
      return fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: "include",
      });
    } else {
      throw new Error('Session expired. Please log in again.');
    }
  }

  return response;
}

async function refreshTokens(): Promise<{ user: User; accessToken: string } | null> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function fetchUser(): Promise<User | null> {
  if (!accessToken) {
    const refreshResult = await refreshTokens();
    if (refreshResult) {
      accessToken = refreshResult.accessToken;
      return refreshResult.user;
    }
    return null;
  }

  const response = await fetchWithAuth("/api/auth/user");

  if (response.status === 401) {
    const refreshResult = await refreshTokens();
    if (refreshResult) {
      accessToken = refreshResult.accessToken;
      return refreshResult.user;
    }
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function loginUser(email: string, password: string): Promise<{ user: User; accessToken: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  const result = await response.json();
  accessToken = result.accessToken;
  return result;
}

export async function registerUser(email: string, password: string, name: string): Promise<{ user: User; accessToken: string }> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }

  const result = await response.json();
  accessToken = result.accessToken;
  return result;
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send reset email");
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to reset password");
  }
}

export async function logoutUser(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  accessToken = null;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { setUser, logout: storeLogout } = useStore();
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: user, isLoading: dbUserLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!dbUserLoading) {
      setIsInitialized(true);
    }
  }, [dbUserLoading]);

  useEffect(() => {
    if (user) {
      setUser({
        id: user.id,
        email: user.email || "",
        name: user.name || user.firstName || "User",
        tone: user.tone || "direct",
        timezone: user.timezone || "UTC",
        defaultSignature: user.defaultSignature || undefined,
        aiEnabled: user.aiEnabled ?? true,
        autoGenerateDrafts: user.autoGenerateDrafts ?? true,
        enablePersonal: user.enablePersonal ?? false,
        personalAiEnabled: user.personalAiEnabled ?? true,
        allowImageStorage: user.allowImageStorage ?? false,
        hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
        hasCompletedTutorial: user.hasCompletedTutorial ?? false,
        isAuthenticated: true,
      });
    }
  }, [user, setUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginUser(email, password);
    queryClient.setQueryData(["/api/auth/user"], result.user);
    return result.user;
  }, [queryClient]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const result = await registerUser(email, password, name);
    queryClient.setQueryData(["/api/auth/user"], result.user);
    return result.user;
  }, [queryClient]);

  const logout = useCallback(async () => {
    storeLogout();
    queryClient.clear();
    await logoutUser();
  }, [queryClient, storeLogout]);

  const isLoading = !isInitialized || dbUserLoading;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refetch,
  };
}
