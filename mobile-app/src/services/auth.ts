import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'actionminutes_access_token';
const REFRESH_TOKEN_KEY = 'actionminutes_refresh_token';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function getTokens(): Promise<AuthTokens | null> {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    
    if (!accessToken || !refreshToken) return null;
    
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Failed to store tokens:', error);
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getTokens();
  return !!tokens?.accessToken;
}
