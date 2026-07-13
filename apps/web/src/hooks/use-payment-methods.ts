"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback } from "react";
import { useAsyncData } from "@/hooks/use-async-data";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { SerializedPaymentMethod } from "@/lib/payment-methods/service";

export type PaymentMethodOption = SerializedPaymentMethod;

export function useEnabledPaymentMethods(organizationId: string) {
  const fetchMethods = useCallback(async () => {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/payment-methods?enabled=true`
    );
    const data = await readJsonResponse<{
      payment_methods?: PaymentMethodOption[];
      error?: string;
    }>(response);

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load payment methods");
    }

    return data.payment_methods ?? [];
  }, [organizationId]);

  return useAsyncData(fetchMethods, [organizationId]);
}

export function paymentMethodKey(method: Pick<PaymentMethodOption, "asset_code" | "issuer_address">) {
  return `${method.asset_code}:${method.issuer_address ?? ""}`;
}
