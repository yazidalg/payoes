"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SessionProvider, signOut as nextAuthSignOut, useSession } from "next-auth/react";
import type {
  AuthStatus,
  AuthUser,
  PortfolioBalance,
  StellarWallet,
} from "@/lib/auth/types";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  wallet: StellarWallet | null;
  portfolio: PortfolioBalance | null;
  error: string | null;
  signOut: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  setupTrustlines: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [wallet, setWallet] = useState<StellarWallet | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioBalance | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user: AuthUser | null = session?.user?.id
    ? {
        id: session.user.id,
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        picture: session.user.image,
      }
    : null;

  const fetchWallet = useCallback(async () => {
    const response = await fetch("/api/wallet");
    if (!response.ok) {
      throw new Error("Failed to load wallet");
    }
    const data = await response.json();
    return data.wallet as StellarWallet | null;
  }, []);

  const provisionWallet = useCallback(async () => {
    const response = await fetch("/api/wallet", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to provision wallet");
    }

    return data.wallet as StellarWallet;
  }, []);

  const refreshBalances = useCallback(async () => {
    const response = await fetch("/api/wallet/balance");
    if (!response.ok) return;

    const data = await response.json();
    setPortfolio(data.portfolio);
  }, []);

  const setupTrustlines = useCallback(async () => {
    const response = await fetch("/api/wallet/trustlines", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to setup trustlines");
    }

    if (data.result?.failed?.length > 0) {
      const message = data.result.failed
        .map((item: { code: string; error: string }) => `${item.code}: ${item.error}`)
        .join(", ");
      throw new Error(message);
    }

    await refreshBalances();
  }, [refreshBalances]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) {
      setWallet(null);
      setPortfolio(null);
      setProvisioning(false);
      return;
    }

    let cancelled = false;

    async function loadOrProvision() {
      setError(null);
      setProvisioning(true);

      try {
        let nextWallet = await fetchWallet();

        if (!nextWallet) {
          nextWallet = await provisionWallet();
        }

        if (cancelled) return;

        setWallet(nextWallet);
        setProvisioning(false);

        await setupTrustlines();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Wallet setup failed");
        setProvisioning(false);
      }
    }

    loadOrProvision();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, session?.user?.id, fetchWallet, provisionWallet, setupTrustlines]);

  const status: AuthStatus = useMemo(() => {
    if (sessionStatus === "loading") return "loading";
    if (sessionStatus === "unauthenticated") return "unauthenticated";
    if (provisioning || !wallet) return "provisioning";
    return "authenticated";
  }, [sessionStatus, provisioning, wallet]);

  const signOut = useCallback(async () => {
    setWallet(null);
    setPortfolio(null);
    setError(null);
    await nextAuthSignOut({ callbackUrl: "/" });
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      wallet,
      portfolio,
      error,
      signOut,
      refreshBalances,
      setupTrustlines,
    }),
    [status, user, wallet, portfolio, error, signOut, refreshBalances, setupTrustlines],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
