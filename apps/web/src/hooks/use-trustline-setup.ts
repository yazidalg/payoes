"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Organization } from "@/lib/db/schema";
import { getHorizonUrl, getNetworkPassphrase } from "@/lib/stellar/network";
import { formatHorizonSubmitError } from "@/lib/stellar/errors";

export type MissingTrustlineAsset = {
  asset_code: string;
  issuer_address: string | null;
  display_name: string;
};

type UseTrustlineSetupOptions = {
  organizationId: string;
  address: string | null;
  environment: Organization["environment"];
  enabled?: boolean;
};

export function useTrustlineSetup({
  organizationId,
  address,
  environment,
  enabled = true,
}: UseTrustlineSetupOptions) {
  const [missingAssets, setMissingAssets] = useState<MissingTrustlineAsset[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastCheckedAddressRef = useRef<string | null>(null);

  const trustlinesUrl = `/api/organizations/${organizationId}/receiving-wallet/trustlines`;

  const checkTrustlines = useCallback(async () => {
    if (!address || !enabled) {
      setMissingAssets([]);
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(trustlinesUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          sourcePublicKey: address,
        }),
      });

      const data = (await response.json()) as {
        missing?: MissingTrustlineAsset[];
        has_missing?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setMissingAssets([]);
        setError(data.error ?? "Unable to check trustlines.");
        return;
      }

      setMissingAssets(data.missing ?? []);
      lastCheckedAddressRef.current = address;

      if ((data.missing?.length ?? 0) === 0) {
        setIsDismissed(false);
      }
    } catch {
      setError("Unable to check trustlines.");
      setMissingAssets([]);
    } finally {
      setIsChecking(false);
    }
  }, [address, enabled, trustlinesUrl]);

  const addTrustlines = useCallback(async () => {
    if (!address) {
      return false;
    }

    setIsAdding(true);
    setError(null);

    try {
      const buildResponse = await fetch(trustlinesUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "build",
          sourcePublicKey: address,
        }),
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
        }
      );

      const server = new Horizon.Server(getHorizonUrl(environment));
      const transaction = TransactionBuilder.fromXDR(
        signedTxXdr,
        getNetworkPassphrase(environment)
      );
      await server.submitTransaction(transaction);

      await checkTrustlines();
      setIsDismissed(false);
      return true;
    } catch (trustlineError) {
      setError(formatHorizonSubmitError(trustlineError));
      await checkTrustlines();
      return false;
    } finally {
      setIsAdding(false);
    }
  }, [address, checkTrustlines, environment, trustlinesUrl]);

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
  const isDialogOpen = Boolean(address) && hasMissing && !isDismissed && enabled;

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
