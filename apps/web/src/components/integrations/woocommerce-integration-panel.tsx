"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrganizationIntegration } from "@/lib/db/schema";
import { IntegrationDetailFormSkeleton } from "@/ui/integrations/integration-detail-skeleton";
import { IntegrationStatus } from "@/ui/integrations/integration-status";
import { SettingsSection } from "@/ui/settings/settings-section";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import { Button, Input } from "@dub/ui";

export function WooCommerceIntegrationPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
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
          "Connect WooCommerce with REST API keys so Payoes can create payments for pending orders.",
      },
    }),
    [],
  );

  useSetDashboardPageHeader(headerOverride);

  const loadIntegration = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(
        `/api/organizations/${organizationId}/integrations/woocommerce`,
      );
      const data = (await response.json()) as {
        integration?: OrganizationIntegration | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load WooCommerce integration");
      }

      setIntegration(data.integration ?? null);
      if (data.integration?.storeIdentifier) {
        setStoreUrl(data.integration.storeIdentifier);
      }
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadIntegration();
  }, [loadIntegration]);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const response = await apiFetch(
        `/api/organizations/${organizationId}/integrations/woocommerce/connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeUrl,
            consumerKey,
            consumerSecret,
          }),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to connect WooCommerce");
      }

      toast.success("WooCommerce connected");
      setConsumerKey("");
      setConsumerSecret("");
      await loadIntegration();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to connect WooCommerce",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      const response = await apiFetch(
        `/api/organizations/${organizationId}/integrations/woocommerce`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to disconnect WooCommerce");
      }

      toast.success("WooCommerce disconnected");
      await loadIntegration();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to disconnect WooCommerce",
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  const isConnected = integration?.status === "connected";

  return (
    <div className="space-y-6">
      <SettingsSection
        title="WooCommerce store"
        description="Use WooCommerce REST API keys with read/write access to orders and webhooks."
        helpText={
          isLoading ? (
            <SmoothSkeleton className="h-4 w-48 max-w-full" />
          ) : isConnected ? (
            `Connected to ${integration?.storeIdentifier}`
          ) : (
            "Generate keys in WooCommerce → Settings → Advanced → REST API."
          )
        }
        action={
          isLoading ? (
            <SmoothSkeleton className="h-9 w-36" />
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
              text="Connect WooCommerce"
              className="h-9 w-fit"
              loading={isConnecting}
              disabled={!storeUrl || !consumerKey || !consumerSecret}
              onClick={() => void handleConnect()}
            />
          )
        }
      >
        {isLoading ? (
          <IntegrationDetailFormSkeleton fieldCount={3} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">Status</span>
              <IntegrationStatus integration={integration} />
            </div>

            {!isConnected ? (
              <div className="grid max-w-xl gap-4">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-neutral-700"
                    htmlFor="woo-store-url"
                  >
                    Store URL
                  </label>
                  <Input
                    id="woo-store-url"
                    value={storeUrl}
                    onChange={(event) => setStoreUrl(event.target.value)}
                    placeholder="https://your-store.com"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-neutral-700"
                    htmlFor="woo-key"
                  >
                    Consumer key
                  </label>
                  <Input
                    id="woo-key"
                    value={consumerKey}
                    onChange={(event) => setConsumerKey(event.target.value)}
                    placeholder="ck_..."
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-neutral-700"
                    htmlFor="woo-secret"
                  >
                    Consumer secret
                  </label>
                  <Input
                    id="woo-secret"
                    type="password"
                    value={consumerSecret}
                    onChange={(event) => setConsumerSecret(event.target.value)}
                    placeholder="cs_..."
                  />
                </div>
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
