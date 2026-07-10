"use client";

import { useEffect, useMemo, useState } from "react";
import { useEnabledPaymentMethods, paymentMethodKey } from "@/hooks/use-payment-methods";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { Combobox, type ComboboxOption } from "@dub/ui";
import { cn } from "@dub/utils";

type AllowedAssetsPickerProps = {
  organizationId: string;
  mode: "settlement" | "allowed" | "pay";
  label?: string;
  settlementKey?: string;
  selectedKeys: string[];
  onChange: (keys: string[], issuers: Map<string, string | null>) => void;
  error?: string;
  onTouch?: () => void;
};

function methodToOption(
  method: {
    id: string;
    asset_code: string;
    issuer_address: string | null;
    display_name: string;
    subtitle: string | null;
  },
): ComboboxOption {
  return {
    value: paymentMethodKey(method),
    label: method.display_name,
    meta: method,
  };
}

export function AllowedAssetsPicker({
  organizationId,
  mode,
  label: labelOverride,
  settlementKey,
  selectedKeys,
  onChange,
  error,
  onTouch,
}: AllowedAssetsPickerProps) {
  const { data: methods, isLoading } = useEnabledPaymentMethods(organizationId);

  const issuerMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const method of methods ?? []) {
      map.set(paymentMethodKey(method), method.issuer_address);
    }
    return map;
  }, [methods]);

  const options = useMemo(
    () => (methods ?? []).map(methodToOption),
    [methods],
  );

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedKeys.includes(option.value)),
    [options, selectedKeys],
  );

  const selectedSingle = useMemo(
    () => selectedOptions[0] ?? null,
    [selectedOptions],
  );

  const label =
    labelOverride ??
    (mode === "settlement"
      ? "Settlement asset"
      : mode === "pay"
        ? "Pay with"
        : "Allowed assets");

  if (isLoading) {
    return (
      <p className="text-content-subtle text-sm">Loading payment methods...</p>
    );
  }

  if (!methods || methods.length === 0) {
    return (
      <p className="text-content-subtle text-sm">
        No enabled payment methods. Configure them in Settings → Payment Methods.
      </p>
    );
  }

  if (mode === "allowed") {
    return (
      <div className="space-y-2">
        <FormFieldLabel htmlFor="allowed-assets-picker" required>
          {label}
        </FormFieldLabel>
        <Combobox
          multiple
          selected={selectedOptions}
          setSelected={(next: ComboboxOption[]) => {
            const nextKeys = next.map((option: ComboboxOption) => option.value);

            if (mode === "allowed" && settlementKey && !nextKeys.includes(settlementKey)) {
              onChange([...nextKeys, settlementKey], issuerMap);
              return;
            }

            onChange(nextKeys.length > 0 ? nextKeys : [options[0]!.value], issuerMap);
          }}
          options={options}
          placeholder="Select allowed assets"
          searchPlaceholder="Search assets..."
          matchTriggerWidth
          optionDescription={(option) => {
            const method = option.meta as { subtitle?: string | null } | undefined;
            return method?.subtitle ?? null;
          }}
          buttonProps={{
            id: "allowed-assets-picker",
            className: "h-10 w-full justify-between",
            textWrapperClassName: "min-w-0 flex-1 text-left",
          }}
        />
        <p className="text-content-subtle text-xs">
          Customers can pay using any selected asset. Settlement asset must stay
          enabled.
        </p>
      </div>
    );
  }

  const singleFieldId =
    mode === "pay" ? "pay-with-asset-picker" : "settlement-asset-picker";

  return (
    <div className="space-y-2">
      <FormFieldLabel htmlFor={singleFieldId} required>
        {label}
      </FormFieldLabel>
      <Combobox
        selected={selectedSingle}
        setSelected={(option: ComboboxOption | null) => {
          onTouch?.();

          if (!option) {
            return;
          }

          onChange([option.value], issuerMap);
        }}
        options={options}
        placeholder={mode === "pay" ? "Select asset" : "Select settlement asset"}
        searchPlaceholder="Search assets..."
        matchTriggerWidth
        optionDescription={(option) => {
          const method = option.meta as { subtitle?: string | null } | undefined;
          return method?.subtitle ?? null;
        }}
        buttonProps={{
          id: singleFieldId,
          className: cn(
            "h-10 w-full justify-between",
            error && "border-red-500",
          ),
          textWrapperClassName: "min-w-0 flex-1 text-left",
        }}
      />
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
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
      methods.map((method) => [paymentMethodKey(method), method.issuer_address] as const),
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
  issuers: Map<string, string | null>,
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
  issuerFromMethod: string | null,
) {
  const [assetCode] = key.split(":");

  return {
    asset_code: assetCode,
    issuer_address: issuerFromMethod,
  };
}
