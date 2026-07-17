import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface AuthUser {
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  demoLogin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_USER: AuthUser = {
  name: 'Berkant Yılmaz',
  email: 'demo@ops360.ai',
  role: 'Yönetici',
};

const STORAGE_KEY = 'ops360_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const persist = useCallback((u: AuthUser | null, remember: boolean) => {
    setUser(u);
    try {
      if (u && remember) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback(
    async (email: string, _password: string, remember: boolean) => {
      const u: AuthUser = {
        name: email.split('@')[0] || 'Kullanıcı',
        email,
        role: 'Yönetici',
      };
      persist(u, remember);
    },
    [persist],
  );

  const demoLogin = useCallback(() => {
    persist(DEMO_USER, true);
  }, [persist]);

  const logout = useCallback(() => {
    persist(null, false);
  }, [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), login, demoLogin, logout }),
    [user, login, demoLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
