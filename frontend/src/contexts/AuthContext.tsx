import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface PinAuthState {
  accessToken: string | null;
  role: 'HQ_ADMIN' | 'STORE_MANAGER' | null;
  storeId: string | null;
  storeName: string | null;
  isFirstLogin: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends PinAuthState {
  setAuth: (data: Omit<PinAuthState, 'isAuthenticated'>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'pin_auth';

function loadState(): PinAuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...JSON.parse(raw), isAuthenticated: true };
  } catch {}
  return { accessToken: null, role: null, storeId: null, storeName: null, isFirstLogin: false, isAuthenticated: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PinAuthState>(loadState);

  const setAuth = useCallback((data: Omit<PinAuthState, 'isAuthenticated'>) => {
    const next: PinAuthState = { ...data, isAuthenticated: !!data.accessToken };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ accessToken: null, role: null, storeId: null, storeName: null, isFirstLogin: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
