"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InfoIcon, RocketIcon, TestTubeDiagonalIcon } from "lucide-react";
import { toast } from "sonner";
import { EnableProductionDialog } from "@/components/dashboard/enable-production-dialog";
import type { Organization } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppModal } from "@/ui/modals/app-modal";

export function EnvironmentModeBanner({
  organization,
  onOrganizationUpdated,
}: {
  organization: Organization;
  onOrganizationUpdated?: (organization: Organization) => void;
}) {
  const router = useRouter();
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [sandboxDialogOpen, setSandboxDialogOpen] = useState(false);
  const [isSwitchingToSandbox, setIsSwitchingToSandbox] = useState(false);

  const isProduction = organization.environment === "production";

  async function handleSwitchToSandbox() {
    setIsSwitchingToSandbox(true);

    const response = await fetch(`/api/organizations/${organization.id}/environment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ environment: "sandbox" }),
    });

    const data = (await response.json()) as {
      error?: string;
      organization?: Organization;
    };

    setIsSwitchingToSandbox(false);

    if (!response.ok) {
      toast.error(data.error ?? "Unable to switch to sandbox");
      return;
    }

    toast.success("Switched to sandbox mode");
    setSandboxDialogOpen(false);
    onOrganizationUpdated?.(data.organization ?? organization);
    router.refresh();
  }

  return (
    <>
      <div
        role="status"
        className={cn(
          "relative z-50 flex w-full shrink-0 items-center border-b px-4 py-3 sm:px-6",
          isProduction
            ? "border-emerald-700 bg-emerald-600 text-emerald-50"
            : "border-[#EAB308] bg-[#FACC15] text-slate-900"
        )}
      >
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {isProduction ? (
              <RocketIcon className="size-4 shrink-0" aria-hidden />
            ) : (
              <InfoIcon className="size-4 shrink-0" aria-hidden />
            )}
            <p className="text-sm font-medium leading-snug sm:text-[15px]">
              {isProduction
                ? "You're live in production. Payments use mainnet and real funds."
                : "You're testing in sandbox. Changes here don't affect your live account."}
            </p>
          </div>

          {isProduction ? (
            <button
              type="button"
              onClick={() => setSandboxDialogOpen(true)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-emerald-50 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100 sm:text-sm"
            >
              <TestTubeDiagonalIcon className="size-3.5" />
              Switch to sandbox
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEnableDialogOpen(true)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 sm:text-sm"
            >
              <RocketIcon className="size-3.5" />
              Switch to production
            </button>
          )}
        </div>
      </div>

      {isProduction ? (
        <AppModal
          open={sandboxDialogOpen}
          onOpenChange={setSandboxDialogOpen}
          title="Switch to sandbox?"
          description="Sandbox mode uses test data and does not affect live mainnet payments. You can switch back to production anytime after verification."
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSandboxDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSwitchToSandbox()}
                isLoading={isSwitchingToSandbox}
              >
                Switch to sandbox
              </Button>
            </>
          }
        />
      ) : enableDialogOpen ? (
        <EnableProductionDialog
          organizationId={organization.id}
          open={enableDialogOpen}
          onOpenChange={setEnableDialogOpen}
          onEnvironmentChanged={() => {
            onOrganizationUpdated?.({
              ...organization,
              environment: "production",
            });
          }}
        />
      ) : null}
    </>
  );
}
