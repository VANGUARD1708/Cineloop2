import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface ChatQuota {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface Identity {
  id: number;
  username: string;
  email: string | null;
  displayName: string;
  avatarUrl: string;
  isPro: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  proUntil: string | null;
  proPlan: string | null;
  proCancelAtPeriodEnd: boolean;
  chatQuota: ChatQuota;
}

interface IdentityContextValue {
  user: Identity | null;
  loading: boolean;
  refresh: () => Promise<void>;
  claim: (email: string) => Promise<Identity>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<IdentityContextValue | null>(null);

const BASE = import.meta.env.BASE_URL;

async function fetchMe(): Promise<Identity | null> {
  const res = await fetch(`${BASE}api/identity/me`, { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as Identity | null;
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const u = await fetchMe();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claim = useCallback(async (email: string): Promise<Identity> => {
    const res = await fetch(`${BASE}api/identity/claim`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Could not claim account");
    }
    const data = (await res.json()) as Identity;
    setUser(data);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await fetch(`${BASE}api/identity/signout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, refresh, claim, signOut }}>{children}</Ctx.Provider>;
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useIdentity must be inside IdentityProvider");
  return ctx;
}
