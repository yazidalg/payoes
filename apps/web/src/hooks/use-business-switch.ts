"use client";

import type { Organization } from "@/lib/db/schema";
import { getHubPathAfterOrganizationSwitch } from "@/lib/navigation/org-switch-redirect";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useBusinessSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeOrganization, setActiveOrganization } = useDashboardShell();
  const [isSwitching, setIsSwitching] = useState(false);

  const switchOrganization = useCallback(
    async (
      organization: Organization,
      options?: {
        onSuccess?: () => void;
      },
    ) => {
      if (
        !activeOrganization ||
        organization.id === activeOrganization.id ||
        isSwitching
      ) {
        return false;
      }

      setIsSwitching(true);

      try {
        const response = await fetch("/api/session/active-organization", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: organization.id }),
        });

        const data = (await response.json()) as {
          organization?: Organization;
          error?: string;
        };

        if (!response.ok || !data.organization) {
          toast.error(data.error ?? "Unable to switch business");
          return false;
        }

        setActiveOrganization(data.organization);
        options?.onSuccess?.();

        const hubPath = getHubPathAfterOrganizationSwitch(pathname);
        if (hubPath) {
          router.push(hubPath);
        }

        router.refresh();
        return true;
      } catch {
        toast.error("Unable to switch business");
        return false;
      } finally {
        setIsSwitching(false);
      }
    },
    [activeOrganization, isSwitching, pathname, router, setActiveOrganization],
  );

  return {
    activeOrganization,
    switchOrganization,
    isSwitching,
  };
}
