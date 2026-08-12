import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loginWithGoogle as loginWithGoogleRequest } from '../lib/api/auth';
import { fetchMe } from '../lib/api/users';
import {
  clearAuth,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '../lib/auth/tokenStorage';
import { clearWorkspaceSelection } from '../lib/storage/appStorage';
import type { User } from '../types/auth';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    return token && storedUser ? storedUser : null;
  });

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    void fetchMe()
      .then((me) => {
        setStoredUser(me);
        setUser(me);
      })
      .catch(() => {});
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const response = await loginWithGoogleRequest({ id_token: idToken });
    setToken(response.access_token);
    setStoredUser(response.user);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    clearWorkspaceSelection();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin ?? false,
      loginWithGoogle,
      logout,
    }),
    [user, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
