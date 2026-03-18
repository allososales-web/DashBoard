import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AuthState, UserInfo, LoginRequest } from '../types/auth.types';
import { authApi } from '../services/auth';

interface AuthContextType extends AuthState {
  login: (dto: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  selectStore: (storeId: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const user = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const selectedStoreId = localStorage.getItem('selectedStoreId');
    return {
      user: user ? JSON.parse(user) : null,
      accessToken,
      refreshToken,
      isAuthenticated: !!accessToken,
      selectedStoreId,
    };
  });

  // On mount: if we have an accessToken, call /auth/me to validate & refresh user info
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    authApi
      .getMe()
      .then((freshUser) => {
        localStorage.setItem('user', JSON.stringify(freshUser));
        setState((prev) => ({ ...prev, user: freshUser }));
      })
      .catch(() => {
        // Token invalid and refresh also failed (interceptor handles 401 → redirect)
        // If we reach here, the interceptor already cleared storage and redirected
      });
  }, []);

  const login = useCallback(async (dto: LoginRequest) => {
    const res = await authApi.login(dto);
    const userInfo: UserInfo = res.user;
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(userInfo));
    setState({
      user: userInfo,
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      isAuthenticated: true,
      selectedStoreId: null,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      const rt = localStorage.getItem('refreshToken');
      if (rt) await authApi.logout(rt);
    } catch {
      // ignore
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedStoreId');
    setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, selectedStoreId: null });
  }, []);

  const selectStore = useCallback((storeId: string) => {
    localStorage.setItem('selectedStoreId', storeId);
    setState((prev) => ({ ...prev, selectedStoreId: storeId }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, selectStore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
