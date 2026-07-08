"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";
import { useEffect, useMemo, useState } from "react";
import { OrganizationMark } from "@/components/organizations/organization-mark";
import { EnvironmentBadge } from "@/components/shared/environment-badge";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { useStellarWallet } from "@/hooks/use-stellar-wallet";
import { getHorizonUrl, getNetworkPassphrase } from "@/lib/stellar/network";
import { formatHorizonSubmitError } from "@/lib/stellar/errors";
import type { Organization } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon } from "lucide-react";

type AllowedAsset = {
  asset_code: string;
  issuer_address: string | null;
};

type CheckoutData = {
  payment: {
    id: string;
    amount: string;
    settlement_asset: AllowedAsset;
    allowed_assets: AllowedAsset[];
    paid_asset: AllowedAsset | null;
    status: string;
    description: string | null;
    environment: Organization["environment"];
    expires_at: string | null;
  };
  merchant: {
    name: string;
    logoUrl: string | null;
    logoInitials: string;
  } | null;
};

function assetKey(asset: AllowedAsset) {
  return `${asset.asset_code}:${asset.issuer_address ?? ""}`;
}

function getStoredCheckoutTxHash(paymentId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(`payoes:checkout-tx:${paymentId}`);
}

export function CheckoutClient({ paymentId }: { paymentId: string }) {
  const [data, setData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaidAssetKey, setSelectedPaidAssetKey] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(() =>
    getStoredCheckoutTxHash(paymentId)
  );
  const [restoredPaymentId, setRestoredPaymentId] = useState(paymentId);

  if (restoredPaymentId !== paymentId) {
    setRestoredPaymentId(paymentId);
    setPendingTxHash(getStoredCheckoutTxHash(paymentId));
  }

  const environment = data?.payment.environment ?? "sandbox";
  const { address, connect, isConnecting, networkLabel } =
    useStellarWallet(environment);

  const allowedAssets = data?.payment.allowed_assets ?? [];
  const selectedPaidAsset = useMemo(() => {
    return (
      allowedAssets.find((asset) => assetKey(asset) === selectedPaidAssetKey) ??
      allowedAssets[0] ??
      null
    );
  }, [allowedAssets, selectedPaidAssetKey]);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/checkout/${paymentId}`);
      const json = (await response.json()) as CheckoutData & { error?: string };

      if (!response.ok) {
        setError(json.error ?? "Payment not found");
        setIsLoading(false);
        return;
      }

      setData(json);
      const firstAsset = json.payment.allowed_assets[0];
      if (firstAsset) {
        setSelectedPaidAssetKey(assetKey(firstAsset));
      }
      setIsLoading(false);
    }

    void load();
  }, [paymentId]);

  async function confirmPayment(txHash: string) {
    const confirmResponse = await fetch(`/api/checkout/${paymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });

    const confirmData = (await confirmResponse.json()) as {
      status?: string;
      error?: string;
    };

    if (!confirmResponse.ok) {
      setPendingTxHash(txHash);
      sessionStorage.setItem(`payoes:checkout-tx:${paymentId}`, txHash);
      setError(confirmData.error ?? "Payment verification failed");
      return false;
    }

    setPendingTxHash(null);
    sessionStorage.removeItem(`payoes:checkout-tx:${paymentId}`);
    setData((current) =>
      current
        ? {
            ...current,
            payment: {
              ...current.payment,
              status: confirmData.status ?? "completed",
            },
          }
        : current
    );

    return true;
  }

  async function handlePay() {
    if (!data || !address || !selectedPaidAsset) {
      return;
    }

    setIsPaying(true);
    setError(null);

    try {
      const buildResponse = await fetch(`/api/checkout/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "build_transaction",
          sourcePublicKey: address,
          paid_asset: selectedPaidAsset,
        }),
      });

      const buildData = (await buildResponse.json()) as {
        xdr?: string;
        error?: string;
      };

      if (!buildResponse.ok || !buildData.xdr) {
        setError(buildData.error ?? "Unable to build transaction");
        setIsPaying(false);
        return;
      }

      const { signedTxXdr } = await StellarWalletsKit.signTransaction(
        buildData.xdr,
        {
          networkPassphrase: getNetworkPassphrase(data.payment.environment),
          address,
        }
      );

      const server = new Horizon.Server(getHorizonUrl(data.payment.environment));
      const transaction = TransactionBuilder.fromXDR(
        signedTxXdr,
        getNetworkPassphrase(data.payment.environment)
      );
      const submitResult = await server.submitTransaction(transaction);

      const confirmed = await confirmPayment(submitResult.hash);
      if (!confirmed) {
        setIsPaying(false);
        return;
      }
    } catch (payError) {
      setError(formatHorizonSubmitError(payError));
    } finally {
      setIsPaying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading checkout...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <AlertBlock type="error">{error ?? "Payment not found"}</AlertBlock>
      </div>
    );
  }

  const isCompleted = data.payment.status === "completed";
  const settlementLabel = data.payment.settlement_asset.asset_code;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          {data.merchant ? (
            <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-muted">
              <OrganizationMark
                organization={{
                  name: data.merchant.name,
                  logoUrl: data.merchant.logoUrl,
                  logoInitials: data.merchant.logoInitials,
                }}
                className="size-full object-cover"
              />
            </div>
          ) : null}
          <div>
            <p className="text-sm text-muted-foreground">Pay</p>
            <p className="text-lg font-semibold">{data.merchant?.name ?? "Merchant"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-muted/40 p-4">
          <p className="text-3xl font-bold tracking-tight">
            {data.payment.amount} {settlementLabel}
          </p>
          {data.payment.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.payment.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Settlement asset: {settlementLabel} · Network: {networkLabel}
          </p>
        </div>

        {isCompleted ? (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2Icon className="size-5" />
            Payment completed successfully.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {allowedAssets.length > 1 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pay with</p>
                <div className="flex flex-wrap gap-2">
                  {allowedAssets.map((asset) => {
                    const key = assetKey(asset);
                    const isSelected = key === selectedPaidAssetKey;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedPaidAssetKey(key)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {asset.asset_code}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {error ? <AlertBlock type="error">{error}</AlertBlock> : null}
            {pendingTxHash ? (
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={() => {
                  setIsPaying(true);
                  void confirmPayment(pendingTxHash).finally(() => {
                    setIsPaying(false);
                  });
                }}
                isLoading={isPaying}
              >
                Retry payment confirmation
              </Button>
            ) : null}
            {!address ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => void connect()}
                isLoading={isConnecting}
              >
                Connect wallet
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={() => void handlePay()}
                isLoading={isPaying}
              >
                Pay {data.payment.amount}{" "}
                {selectedPaidAsset?.asset_code ?? settlementLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
