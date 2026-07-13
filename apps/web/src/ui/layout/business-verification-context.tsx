"use client";

import { apiFetch } from "@/lib/api-client";
import type { Organization, OrganizationVerificationApplication } from "@/lib/db/schema";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useDashboardShell } from "./dashboard-shell-context";

export type BusinessVerificationSummary = {
  organization: Organization;
  application: OrganizationVerificationApplication | null;
  isExpired: boolean;
  canSwitchToProduction: boolean;
};

type BusinessVerificationContextValue = {
  isVerified: boolean;
  isLoading: boolean;
  isExpired: boolean;
  canSwitchToProduction: boolean;
  summary: BusinessVerificationSummary | null;
  refresh: () => Promise<void>;
};

const BusinessVerificationContext =
  createContext<BusinessVerificationContextValue | null>(null);

async function fetchVerificationSummary(organizationId: string) {
  const response = await apiFetch(`/api/organizations/${organizationId}/verification`);
  const data = (await response.json()) as BusinessVerificationSummary & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load verification status");
  }

  return data;
}

function BusinessVerificationProviderInner({
  organizationId,
  children,
}: {
  organizationId: string;
  children: ReactNode;
}) {
  const [summary, setSummary] = useState<BusinessVerificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setIsLoading(true);

      try {
        const nextSummary = await fetchVerificationSummary(organizationId);

        if (!cancelled) {
          setSummary(nextSummary);
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [organizationId, refreshToken]);

  const refresh = useCallback(async () => {
    setRefreshToken((token) => token + 1);
  }, []);

  const isExpired = summary?.isExpired ?? false;
  const isVerified =
    summary?.organization.verificationStatus === "verified" && !isExpired;

  const value = useMemo<BusinessVerificationContextValue>(
    () => ({
      isVerified,
      isLoading,
      isExpired,
      canSwitchToProduction: summary?.canSwitchToProduction ?? false,
      summary,
      refresh,
    }),
    [isExpired, isLoading, isVerified, refresh, summary],
  );

  return (
    <BusinessVerificationContext.Provider value={value}>
      {children}
    </BusinessVerificationContext.Provider>
  );
}

export function BusinessVerificationProvider({ children }: { children: ReactNode }) {
  const { activeOrganization } = useDashboardShell();

  return (
    <BusinessVerificationProviderInner
      key={activeOrganization.id}
      organizationId={activeOrganization.id}
    >
      {children}
    </BusinessVerificationProviderInner>
  );
}

export function useBusinessVerification() {
  const context = useContext(BusinessVerificationContext);

  if (!context) {
    throw new Error(
      "useBusinessVerification must be used within BusinessVerificationProvider",
    );
  }

  return context;
}
