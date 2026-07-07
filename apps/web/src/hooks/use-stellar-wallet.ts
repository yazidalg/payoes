"use client";

import { useCallback, useEffect, useState } from "react";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import {
  KitEventType,
  Networks,
} from "@creit.tech/stellar-wallets-kit/types";
import type { Organization } from "@/lib/db/schema";
import { getNetworkLabel, getNetworkPassphrase } from "@/lib/stellar/network";

export function useStellarWallet(environment: Organization["environment"]) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const expectedPassphrase = getNetworkPassphrase(environment);

  useEffect(() => {
    StellarWalletsKit.init({
      modules: defaultModules(),
      network:
        environment === "production" ? Networks.PUBLIC : Networks.TESTNET,
    });
    setIsReady(true);

    const unsubscribe = StellarWalletsKit.on(
      KitEventType.STATE_UPDATED,
      (event) => {
        setAddress(event.payload.address ?? null);
      }
    );

    StellarWalletsKit.getAddress()
      .then(({ address: connectedAddress }) => {
        setAddress(connectedAddress);
      })
      .catch(() => {
        setAddress(null);
      });

    return unsubscribe;
  }, [environment]);

  const validateNetwork = useCallback(async () => {
    const { networkPassphrase } = await StellarWalletsKit.getNetwork();

    if (networkPassphrase !== expectedPassphrase) {
      setNetworkError(
        `Switch your wallet to ${getNetworkLabel(environment)} to continue in ${environment} mode.`
      );
      return false;
    }

    setNetworkError(null);
    return true;
  }, [environment, expectedPassphrase]);

  const connect = useCallback(async () => {
    if (!isReady) {
      return;
    }

    setIsConnecting(true);
    setConnectError(null);
    setNetworkError(null);

    try {
      const { address: connectedAddress } = await StellarWalletsKit.authModal();
      const isValidNetwork = await validateNetwork();

      if (!isValidNetwork) {
        await StellarWalletsKit.disconnect();
        setAddress(null);
        setWalletProvider(null);
        return;
      }

      setAddress(connectedAddress);
      setWalletProvider(StellarWalletsKit.selectedModule.productId);
    } catch {
      setConnectError("Wallet connection was cancelled or failed. Try again.");
    } finally {
      setIsConnecting(false);
    }
  }, [isReady, validateNetwork]);

  const disconnect = useCallback(async () => {
    await StellarWalletsKit.disconnect();
    setAddress(null);
    setWalletProvider(null);
    setNetworkError(null);
    setConnectError(null);
  }, []);

  return {
    address,
    walletProvider,
    networkError,
    connectError,
    isConnecting,
    isReady,
    connect,
    disconnect,
    networkLabel: getNetworkLabel(environment),
  };
}
