"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Organization } from "@/lib/db/schema";
import { getHorizonUrl, getNetworkPassphrase } from "@/lib/stellar/network";
import { apiFetch } from "@/lib/api-client";
import { formatHorizonSubmitError } from "@/lib/stellar/errors";

export type MissingTrustlineAsset = {
  asset_code: string;
  issuer_address: string | null;
  display_name: string;
};

type UseTrustlineSetupOptions = {
  organizationId?: string;
  useDefaultAssets?: boolean;
  address: string | null;
  environment: Organization["environment"];
  enabled?: boolean;
  required?: boolean;
};

export function useTrustlineSetup({
  organizationId,
  useDefaultAssets = false,
  address,
  environment,
  enabled = true,
  required = false,
}: UseTrustlineSetupOptions) {
  const [missingAssets, setMissingAssets] = useState<MissingTrustlineAsset[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastCheckedAddressRef = useRef<string | null>(null);

  const trustlinesUrl = useDefaultAssets
    ? "/api/trustlines/preview"
    : `/api/organizations/${organizationId}/settlement-wallet/trustlines`;

  const requestBody = useCallback(
    (action: "check" | "build", enabledMethodIds?: string[]) => {
      const body: Record<string, unknown> = {
        action,
        sourcePublicKey: address,
        environment,
      };

      if (enabledMethodIds?.length) {
        body.enabled_method_ids = enabledMethodIds;
      }

      if (useDefaultAssets) {
        return body;
      }

      return body;
    },
    [address, environment, useDefaultAssets],
  );

  const checkTrustlines = useCallback(
    async (enabledMethodIds?: string[]) => {
      if (!address || !enabled) {
        setMissingAssets([]);
        return [];
      }

      if (!useDefaultAssets && !organizationId) {
        setMissingAssets([]);
        return [];
      }

      setIsChecking(true);
      setError(null);

      try {
        const response = await apiFetch(trustlinesUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody("check", enabledMethodIds)),
        });

        const data = (await response.json()) as {
          missing?: MissingTrustlineAsset[];
          has_missing?: boolean;
          error?: string;
        };

        if (!response.ok) {
          setMissingAssets([]);
          setError(data.error ?? "Unable to check trustlines.");
          return [];
        }

        const missing = data.missing ?? [];
        setMissingAssets(missing);
        lastCheckedAddressRef.current = address;

        if (missing.length === 0) {
          setIsDismissed(false);
        }

        return missing;
      } catch {
        setError("Unable to check trustlines.");
        setMissingAssets([]);
        return [];
      } finally {
        setIsChecking(false);
      }
    },
    [address, enabled, organizationId, requestBody, trustlinesUrl, useDefaultAssets],
  );

  const addTrustlines = useCallback(
    async (enabledMethodIds?: string[]) => {
      if (!address) {
        return false;
      }

      if (!useDefaultAssets && !organizationId) {
        return false;
      }

      setIsAdding(true);
      setError(null);

      try {
        const buildResponse = await apiFetch(trustlinesUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody("build", enabledMethodIds)),
        });

        const buildData = (await buildResponse.json()) as {
          xdr?: string | null;
          error?: string;
        };

        if (!buildResponse.ok) {
          setError(buildData.error ?? "Unable to prepare trustline transaction.");
          return false;
        }

        if (!buildData.xdr) {
          setMissingAssets([]);
          setIsDismissed(false);
          return true;
        }

        const { signedTxXdr } = await StellarWalletsKit.signTransaction(
          buildData.xdr,
          {
            networkPassphrase: getNetworkPassphrase(environment),
            address,
          },
        );

        const server = new Horizon.Server(getHorizonUrl(environment));
        const transaction = TransactionBuilder.fromXDR(
          signedTxXdr,
          getNetworkPassphrase(environment),
        );
        await server.submitTransaction(transaction);

        await checkTrustlines(enabledMethodIds);
        setIsDismissed(false);
        return true;
      } catch (trustlineError) {
        setError(formatHorizonSubmitError(trustlineError));
        await checkTrustlines(enabledMethodIds);
        return false;
      } finally {
        setIsAdding(false);
      }
    },
    [
      address,
      checkTrustlines,
      environment,
      organizationId,
      requestBody,
      trustlinesUrl,
      useDefaultAssets,
    ],
  );

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (!address) {
      setMissingAssets([]);
      setIsDismissed(false);
      lastCheckedAddressRef.current = null;
      return;
    }

    if (lastCheckedAddressRef.current !== address) {
      setIsDismissed(false);
    }

    void checkTrustlines();
  }, [address, checkTrustlines]);

  const hasMissing = missingAssets.length > 0;
  const isDialogOpen =
    Boolean(address) &&
    hasMissing &&
    enabled &&
    (required || !isDismissed);

  return {
    missingAssets,
    hasMissing,
    isDialogOpen,
    isChecking,
    isAdding,
    error,
    checkTrustlines,
    addTrustlines,
    dismiss,
  };
}
