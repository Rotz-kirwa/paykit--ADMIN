// Demo-only client-side auth. Replace with Lovable Cloud auth in v2.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AuthCtx {
  isAuthenticated: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "demo_admin_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(KEY);
    if (v) setEmail(v);
  }, []);

  const login = async (em: string, _pw: string) => {
    await new Promise((r) => setTimeout(r, 400));
    window.localStorage.setItem(KEY, em);
    setEmail(em);
  };
  const logout = () => {
    window.localStorage.removeItem(KEY);
    setEmail(null);
  };

  return (
    <Ctx.Provider value={{ isAuthenticated: !!email, email, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
