"use client";

import { Label } from "@/components/ui/label";
import { useEnabledPaymentMethods, paymentMethodKey } from "@/hooks/use-payment-methods";
import { cn } from "@/lib/utils";

type PaymentAssetPickerProps = {
  organizationId: string;
  value: string;
  onChange: (value: string, issuerAddress: string | null) => void;
};

export function PaymentAssetPicker({
  organizationId,
  value,
  onChange,
}: PaymentAssetPickerProps) {
  const { data: methods, isLoading } = useEnabledPaymentMethods(organizationId);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading accepted assets…</p>
    );
  }

  if (!methods || methods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No enabled payment methods. Add assets in Settings → Payment Methods.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Asset</Label>
      <div className="flex flex-wrap gap-2">
        {methods.map((method) => {
          const key = paymentMethodKey(method);
          const isSelected = value === key;

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onChange(key, method.issuer_address)}
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
    </div>
  );
}

export function parsePaymentAssetSelection(
  key: string,
  issuerFromMethod: string | null
) {
  const [assetCode] = key.split(":");

  return {
    asset: assetCode,
    asset_issuer: issuerFromMethod,
  };
}
