"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { OrganizationIntegration } from "@/lib/db/schema";
import { IntegrationDetailFormSkeleton } from "@/ui/integrations/integration-detail-skeleton";
import { IntegrationStatus } from "@/ui/integrations/integration-status";
import { SettingsSection } from "@/ui/settings/settings-section";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import { Button, Input } from "@dub/ui";

export function ShopifyIntegrationPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shop, setShop] = useState("");
  const [integration, setIntegration] = useState<OrganizationIntegration | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title:
          "Authorize Payoes to receive Shopify order events and create hosted checkout payments.",
      },
    }),
    [],
  );

  useSetDashboardPageHeader(headerOverride);

  const loadIntegration = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(
        `/api/organizations/${organizationId}/integrations/shopify`,
      );
      const data = (await response.json()) as {
        integration?: OrganizationIntegration | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load Shopify integration");
      }

      setIntegration(data.integration ?? null);
      if (data.integration?.storeIdentifier) {
        setShop(data.integration.storeIdentifier.replace(".myshopify.com", ""));
      }
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadIntegration();
  }, [loadIntegration]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "1") {
      toast.success("Shopify connected");
      router.replace("/dashboard/integrations/shopify");
      return;
    }

    if (!error) {
      return;
    }

    void (async () => {
      try {
        const response = await apiFetch(
          `/api/organizations/${organizationId}/integrations/shopify`,
        );
        const data = (await response.json()) as {
          integration?: OrganizationIntegration | null;
        };

        const lastError = data.integration?.lastError;
        toast.error(lastError ?? "Unable to connect Shopify");
        setIntegration(data.integration ?? null);
        if (data.integration?.storeIdentifier) {
          setShop(
            data.integration.storeIdentifier.replace(".myshopify.com", ""),
          );
        }
      } catch {
        toast.error("Unable to connect Shopify");
      } finally {
        router.replace("/dashboard/integrations/shopify");
      }
    })();
  }, [organizationId, router, searchParams]);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const response = await apiFetch(
        `/api/organizations/${organizationId}/integrations/shopify/connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop }),
        },
      );
      const data = (await response.json()) as {
        authorizationUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.authorizationUrl) {
        throw new Error(data.error ?? "Unable to start Shopify connection");
      }

      window.location.href = data.authorizationUrl;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to connect Shopify",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      const response = await apiFetch(
        `/api/organizations/${organizationId}/integrations/shopify`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to disconnect Shopify");
      }

      toast.success("Shopify disconnected");
      await loadIntegration();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to disconnect Shopify",
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  const isConnected = integration?.status === "connected";

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Shopify store"
        description="Connect your Shopify store to create Payoes payments when pending orders are created."
        helpText={
          isLoading ? (
            <SmoothSkeleton className="h-4 w-48 max-w-full" />
          ) : isConnected ? (
            `Connected to ${integration?.storeIdentifier}`
          ) : (
            "You will be redirected to Shopify to approve access."
          )
        }
        action={
          isLoading ? (
            <SmoothSkeleton className="h-9 w-32" />
          ) : isConnected ? (
            <Button
              type="button"
              variant="secondary"
              text="Disconnect"
              className="h-9 w-fit"
              loading={isDisconnecting}
              onClick={() => void handleDisconnect()}
            />
          ) : (
            <Button
              type="button"
              variant="primary"
              text="Connect Shopify"
              className="h-9 w-fit"
              loading={isConnecting}
              disabled={!shop.trim()}
              onClick={() => void handleConnect()}
            />
          )
        }
      >
        {isLoading ? (
          <IntegrationDetailFormSkeleton fieldCount={1} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">Status</span>
              <IntegrationStatus integration={integration} />
            </div>

            {!isConnected ? (
              <div className="max-w-md space-y-2">
                <label
                  className="text-sm font-medium text-neutral-700"
                  htmlFor="shopify-shop"
                >
                  Shop domain
                </label>
                <Input
                  id="shopify-shop"
                  value={shop}
                  onChange={(event) => setShop(event.target.value)}
                  placeholder="your-store"
                />
                <p className="text-sm text-neutral-500">
                  Enter your store slug, for example `your-store` for
                  `your-store.myshopify.com`.
                </p>
              </div>
            ) : null}

            {integration?.lastError ? (
              <p className="text-sm text-red-500">{integration.lastError}</p>
            ) : null}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
