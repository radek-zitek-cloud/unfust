import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  type UserProfile,
  getProfile,
  setAccessToken,
  logout as apiLogout,
  login as apiLogin,
  register as apiRegister,
} from "./api";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    firstName: string,
    lastName: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch {
      setUser(null);
    }
  }, []);

  // Silent refresh on mount
  useEffect(() => {
    async function init() {
      try {
        // Try to get a new access token from the refresh cookie
        const resp = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (resp.ok) {
          const data = await resp.json();
          setAccessToken(data.access_token);
          const profile = await getProfile();
          setUser(profile);
        }
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    const profile = await getProfile();
    setUser(profile);
  }, []);

  const register = useCallback(
    async (
      email: string,
      firstName: string,
      lastName: string,
      password: string
    ) => {
      await apiRegister(email, firstName, lastName, password);
      const profile = await getProfile();
      setUser(profile);
    },
    []
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
