"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { useEnabledPaymentMethods, paymentMethodKey } from "@/hooks/use-payment-methods";
import { cn } from "@/lib/utils";

type AllowedAssetsPickerProps = {
  organizationId: string;
  mode: "settlement" | "allowed" | "pay";
  settlementKey?: string;
  selectedKeys: string[];
  onChange: (keys: string[], issuers: Map<string, string | null>) => void;
};

export function AllowedAssetsPicker({
  organizationId,
  mode,
  settlementKey,
  selectedKeys,
  onChange,
}: AllowedAssetsPickerProps) {
  const { data: methods, isLoading } = useEnabledPaymentMethods(organizationId);

  const issuerMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const method of methods ?? []) {
      map.set(paymentMethodKey(method), method.issuer_address);
    }
    return map;
  }, [methods]);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading accepted assets…</p>
    );
  }

  if (!methods || methods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No enabled assets. Configure assets in Settings → Assets.
      </p>
    );
  }

  function toggleKey(key: string) {
    if (mode === "settlement" || mode === "pay") {
      onChange([key], issuerMap);
      return;
    }

    const next = selectedKeys.includes(key)
      ? selectedKeys.filter((item) => item !== key)
      : [...selectedKeys, key];

    if (settlementKey && !next.includes(settlementKey)) {
      onChange([...next, settlementKey], issuerMap);
      return;
    }

    onChange(next.length > 0 ? next : [key], issuerMap);
  }

  const label =
    mode === "settlement"
      ? "Settlement asset"
      : mode === "pay"
        ? "Pay with"
        : "Allowed assets";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {methods.map((method) => {
          const key = paymentMethodKey(method);
          const isSelected = selectedKeys.includes(key);

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => toggleKey(key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {method.display_name}
            </button>
          );
        })}
      </div>
      {mode === "allowed" ? (
        <p className="text-xs text-muted-foreground">
          Customers can pay using any selected asset. Settlement asset must stay enabled.
        </p>
      ) : null}
    </div>
  );
}

export function useDefaultAssetSelection(organizationId: string) {
  const { data: methods } = useEnabledPaymentMethods(organizationId);
  const [settlementKey, setSettlementKey] = useState("");
  const [allowedKeys, setAllowedKeys] = useState<string[]>([]);
  const [issuers, setIssuers] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (!methods || methods.length === 0) {
      return;
    }

    const defaultMethod =
      methods.find((method) => method.is_default) ?? methods[0];
    const defaultKey = paymentMethodKey(defaultMethod);
    const allKeys = methods.map((method) => paymentMethodKey(method));
    const map = new Map(
      methods.map((method) => [paymentMethodKey(method), method.issuer_address] as const)
    );

    setSettlementKey(defaultKey);
    setAllowedKeys(allKeys);
    setIssuers(map);
  }, [methods]);

  return {
    methods,
    settlementKey,
    setSettlementKey,
    allowedKeys,
    setAllowedKeys,
    issuers,
    setIssuers,
  };
}

export function keysToAssetPayload(
  settlementKey: string,
  allowedKeys: string[],
  issuers: Map<string, string | null>
) {
  const [settlementCode] = settlementKey.split(":");

  return {
    settlement_asset: {
      asset_code: settlementCode,
      issuer_address: issuers.get(settlementKey) ?? null,
    },
    allowed_assets: allowedKeys.map((key) => {
      const [assetCode] = key.split(":");
      return {
        asset_code: assetCode,
        issuer_address: issuers.get(key) ?? null,
      };
    }),
  };
}

export function parsePaymentAssetSelection(
  key: string,
  issuerFromMethod: string | null
) {
  const [assetCode] = key.split(":");

  return {
    asset_code: assetCode,
    issuer_address: issuerFromMethod,
  };
}
