import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError, resetCsrf } from "../../lib/api";
import type { User } from "../../types";
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api<{ user: User }>("/auth/me");
      setUser(r.data.user);
    } catch (e) {
      setUser(null);
      if (!(e instanceof ApiError && e.status === 401))
        setError(
          e instanceof Error ? e.message : "Unable to verify your session.",
        );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  const login = async (email: string, password: string) => {
    const r = await api<{ user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(r.data.user);
    setError("");
  };
  const register = async (name: string, email: string, password: string) => {
    await api("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    await login(email, password);
  };
  const logout = async () => {
    await api("/auth/logout", { method: "POST", body: {} });
    setUser(null);
    resetCsrf();
  };
  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, register, logout, reload }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}
