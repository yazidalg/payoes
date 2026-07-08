"use client";

import { useCallback, useState } from "react";
import {
  BadgeCheckIcon,
  CheckCircle2Icon,
  CoinsIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AddAssetDialog } from "@/components/payment-methods/add-asset-dialog";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAsyncData } from "@/hooks/use-async-data";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { SerializedPaymentMethod } from "@/lib/payment-methods/service";
import { cn } from "@/lib/utils";

type OfficialAssetOption = {
  asset_code: string;
  display_name: string;
  description: string;
  issued_by: string | null;
};

type PaymentMethodsResponse = {
  payment_methods: SerializedPaymentMethod[];
  available_official_assets: OfficialAssetOption[];
  settlement_asset_id: string | null;
};

function StatusBadge({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        enabled
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

function PaymentMethodCard({
  method,
  onToggle,
  onRemove,
  onSetDefault,
}: {
  method: SerializedPaymentMethod;
  onToggle: (enabled: boolean) => Promise<void>;
  onRemove: () => Promise<void>;
  onSetDefault: () => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function run(action: () => Promise<void>) {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-muted text-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
            <CoinsIcon className="size-5" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight">
                {method.display_name}
              </h3>
              {method.is_verified ? (
                <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  <BadgeCheckIcon className="size-3.5" />
                  Verified
                </span>
              ) : null}
              {method.is_default ? (
                <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  <SparklesIcon className="size-3.5" />
                  Settlement
                </span>
              ) : null}
            </div>
            {method.subtitle ? (
              <p className="text-sm text-muted-foreground">{method.subtitle}</p>
            ) : null}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              <StatusBadge
                enabled={method.is_enabled}
                label={method.is_enabled ? "Enabled" : "Disabled"}
              />
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isLoading}
                aria-label="Payment method actions"
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => run(() => onToggle(!method.is_enabled))}
            >
              {method.is_enabled ? "Disable" : "Enable"}
            </DropdownMenuItem>
            {!method.is_default ? (
              <DropdownMenuItem onClick={() => run(onSetDefault)}>
                Set as settlement asset
              </DropdownMenuItem>
            ) : null}
            {!method.is_official ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => run(onRemove)}
                >
                  Remove
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function PaymentMethodsPanel({ organizationId }: { organizationId: string }) {
  const [addOpen, setAddOpen] = useState(false);

  const fetchMethods = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/payment-methods`);
    const data = await readJsonResponse<PaymentMethodsResponse & { error?: string }>(
      response
    );

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load payment methods");
    }

    return data;
  }, [organizationId]);

  const { data, error, isLoading, reload } = useAsyncData(fetchMethods, [organizationId]);

  async function toggleMethod(methodId: string, enabled: boolean) {
    const response = await fetch(
      `/api/organizations/${organizationId}/payment-methods/${methodId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: enabled }),
      }
    );

    const payload = await readJsonResponse<{ error?: string }>(response);

    if (!response.ok) {
      toast.error(payload.error ?? "Unable to update payment method");
      return;
    }

    toast.success(enabled ? "Asset enabled" : "Asset disabled");
    reload();
  }

  async function removeMethod(methodId: string) {
    const response = await fetch(
      `/api/organizations/${organizationId}/payment-methods/${methodId}`,
      { method: "DELETE" }
    );

    const payload = await readJsonResponse<{ error?: string }>(response);

    if (!response.ok) {
      toast.error(payload.error ?? "Unable to remove payment method");
      return;
    }

    toast.success("Asset removed");
    reload();
  }

  async function setSettlement(methodId: string) {
    const response = await fetch(
      `/api/organizations/${organizationId}/payment-methods/settlement`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method_id: methodId }),
      }
    );

    const payload = await readJsonResponse<{ error?: string }>(response);

    if (!response.ok) {
      toast.error(payload.error ?? "Unable to update settlement asset");
      return;
    }

    toast.success("Settlement asset updated");
    reload();
  }

  const enabledMethods = data?.payment_methods.filter((method) => method.is_enabled) ?? [];
  const settlementId = data?.settlement_asset_id ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Choose which Stellar assets customers can use when paying your business.
            Official assets are pre-verified; custom assets can be added with an issuer address.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <PlusIcon className="size-4" />
          Add Asset
        </Button>
      </div>

      {error ? <AlertBlock type="error">{error}</AlertBlock> : null}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Accepted Assets</CardTitle>
          <CardDescription>
            Assets available when creating payments, payment links, invoices, and subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading payment methods…</p>
          ) : (
            data?.payment_methods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onToggle={(enabled) => toggleMethod(method.id, enabled)}
                onRemove={() => removeMethod(method.id)}
                onSetDefault={() => setSettlement(method.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Settlement Asset</CardTitle>
          <CardDescription>
            Cross-asset payments are settled on-chain via Stellar path payments when the
            customer pays with a different asset than your settlement asset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="text-sm font-medium" htmlFor="settlement-asset">
            Settlement asset
          </label>
          <select
            id="settlement-asset"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full max-w-sm rounded-xl border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            value={settlementId ?? ""}
            onChange={(event) => {
              if (event.target.value) {
                void setSettlement(event.target.value);
              }
            }}
          >
            <option value="" disabled>
              Select settlement asset
            </option>
            {enabledMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.display_name}
              </option>
            ))}
          </select>
          {settlementId ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <CheckCircle2Icon className="size-4 text-emerald-600" />
              Path payments and checkout quotes convert customer payments into this asset.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AddAssetDialog
        organizationId={organizationId}
        open={addOpen}
        onOpenChange={setAddOpen}
        availableOfficialAssets={data?.available_official_assets ?? []}
        onAdded={reload}
      />
    </div>
  );
}
