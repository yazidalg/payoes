"use client";

import { useCallback, useEffect, useState } from "react";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import type { Organization } from "@/lib/db/schema";
import { getNetworkLabel, getNetworkPassphrase } from "@/lib/stellar/network";

async function clearWalletSession() {
  try {
    await StellarWalletsKit.disconnect();
  } catch {
    // Ignore when no wallet session exists.
  }
}

export function useReceivingWalletConnection(
  environment: Organization["environment"]
) {
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const expectedPassphrase = getNetworkPassphrase(environment);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await clearWalletSession();

      StellarWalletsKit.init({
        modules: defaultModules(),
        network:
          environment === "production" ? Networks.PUBLIC : Networks.TESTNET,
      });

      if (!cancelled) {
        setIsReady(true);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [environment]);

  const validateNetwork = useCallback(async () => {
    const { networkPassphrase } = await StellarWalletsKit.getNetwork();

    if (networkPassphrase !== expectedPassphrase) {
      setNetworkError(
        `Switch your wallet to ${getNetworkLabel(environment)} before continuing.`
      );
      return false;
    }

    setNetworkError(null);
    return true;
  }, [environment, expectedPassphrase]);

  const connect = useCallback(async () => {
    if (!isReady) {
      return null;
    }

    setIsConnecting(true);
    setConnectError(null);
    setNetworkError(null);
    setPendingAddress(null);
    setWalletProvider(null);

    try {
      await clearWalletSession();

      const { address: connectedAddress } = await StellarWalletsKit.authModal();
      const isValidNetwork = await validateNetwork();

      if (!isValidNetwork) {
        await clearWalletSession();
        return null;
      }

      const provider = StellarWalletsKit.selectedModule?.productId ?? null;
      setPendingAddress(connectedAddress);
      setWalletProvider(provider);

      return connectedAddress;
    } catch {
      setConnectError("Wallet connection was cancelled or failed. Try again.");
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [isReady, validateNetwork]);

  const clearPending = useCallback(() => {
    setPendingAddress(null);
    setWalletProvider(null);
    setConnectError(null);
    setNetworkError(null);
  }, []);

  return {
    pendingAddress,
    walletProvider,
    networkError,
    connectError,
    isConnecting,
    isReady,
    connect,
    clearPending,
    networkLabel: getNetworkLabel(environment),
  };
}
