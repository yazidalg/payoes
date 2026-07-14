"use client";

import type { Organization } from "@/lib/db/schema";
import {
  DROPDOWN_ORGANIZATION_LIMIT,
  getPrioritizedOrganizations,
} from "@/lib/organizations/list-utils";
import { useBusinessSwitch } from "@/hooks/use-business-switch";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { BusinessListItem } from "@/ui/business/business-list-item";
import { Avatar, Button, Popover } from "@dub/ui";
import { Gear, Plus, UserPlus } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ChevronDown, TestTubeDiagonal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AppModal } from "@/ui/modals/app-modal";

type DashboardUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

function getUserDisplayName(user: DashboardUser) {
  return user.name?.trim() || user.email?.split("@")[0] || "User";
}

function UserProfileMark({ user, className }: { user: DashboardUser; className?: string }) {
  return <Avatar imageUrl={user.image} identifier={user.email ?? user.name ?? "user"} className={className} />;
}

export function OrgDropdown({ placement = "switcher" }: { placement?: "switcher" | "sidebar-bottom" }) {
  const { organizations, activeOrganization, user } = useDashboardShell();
  const [openPopover, setOpenPopover] = useState(false);
  const router = useRouter();

  if (!activeOrganization) {
    return <OrgDropdownPlaceholder placement={placement} />;
  }

  const isSidebarBottom = placement === "sidebar-bottom";

  return (
    <div className={cn(isSidebarBottom && "w-full")}>
      <Popover
        content={
          <OrgList
            user={user}
            organizations={organizations}
            activeOrganization={activeOrganization}
            setOpenPopover={setOpenPopover}
            onCreateBusiness={() => {
              setOpenPopover(false);
              router.push("/business/new");
            }}
          />
        }
        side={isSidebarBottom ? "top" : "right"}
        align="start"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}>
        {isSidebarBottom ? (
          <button type="button" onClick={() => setOpenPopover(!openPopover)} className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-all duration-75", "hover:bg-bg-inverted/5 active:bg-bg-inverted/10 data-[state=open]:bg-bg-inverted/10", "outline-none focus-visible:ring-2 focus-visible:ring-primary/50")}>
            <div className="flex size-8 shrink-0 overflow-hidden rounded-full">
              <UserProfileMark user={user} className="size-full" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate font-medium text-neutral-900">{getUserDisplayName(user)}</div>
              <div className="truncate text-xs text-neutral-500">{activeOrganization.name}</div>
            </div>
            <ChevronDown className="size-4 shrink-0 text-neutral-400" />
          </button>
        ) : (
          <button type="button" onClick={() => setOpenPopover(!openPopover)} className={cn("flex size-11 items-center justify-center rounded-lg p-1.5 text-left text-sm transition-all duration-75", "hover:bg-bg-inverted/5 active:bg-bg-inverted/10 data-[state=open]:bg-bg-inverted/10", "outline-none focus-visible:ring-2 focus-visible:ring-primary/50")}>
            <div className="flex size-7 overflow-hidden rounded-full">
              <UserProfileMark user={user} className="size-full" />
            </div>
          </button>
        )}
      </Popover>
    </div>
  );
}

function OrgDropdownPlaceholder({ placement = "switcher" }: { placement?: "switcher" | "sidebar-bottom" }) {
  return <div className={cn("animate-pulse rounded-lg bg-neutral-300", placement === "sidebar-bottom" ? "h-12 w-full" : "size-11")} />;
}

function OrgList({
  user,
  organizations,
  activeOrganization,
  setOpenPopover,
  onCreateBusiness,
}: {
  user: DashboardUser;
  organizations: Organization[];
  activeOrganization: Organization;
  setOpenPopover: (open: boolean) => void;
  onCreateBusiness: () => void;
}) {
  const router = useRouter();
  const { switchOrganization, isSwitching } = useBusinessSwitch();
  const [sandboxDialogOpen, setSandboxDialogOpen] = useState(false);
  const [isSwitchingToSandbox, setIsSwitchingToSandbox] = useState(false);
  const { setActiveOrganization } = useDashboardShell();
  const isProduction = activeOrganization.environment === "production";
  const visibleOrganizations = getPrioritizedOrganizations(
    organizations,
    activeOrganization.id,
    DROPDOWN_ORGANIZATION_LIMIT,
  );
  const hasMoreOrganizations = organizations.length > DROPDOWN_ORGANIZATION_LIMIT;

  async function handleSwitchToSandbox() {
    setIsSwitchingToSandbox(true);

    const response = await fetch(`/api/organizations/${activeOrganization.id}/environment`, {
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

    setSandboxDialogOpen(false);
    setOpenPopover(false);

    if (data.organization) {
      setActiveOrganization(data.organization);
    }

    router.refresh();
  }

  async function selectOrganization(organization: Organization) {
    await switchOrganization(organization, {
      onSuccess: () => setOpenPopover(false),
    });
  }

  return (
    <>
      <div className="w-72 rounded-xl bg-white text-sm">
        <div className="border-b border-neutral-200 px-3 py-3">
          <div className="flex items-center gap-x-2.5 text-left">
            <div className="flex size-8 shrink-0 overflow-hidden rounded-full">
              <UserProfileMark user={user} className="size-full" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-neutral-900">{getUserDisplayName(user)}</div>
              <div className="truncate text-xs text-neutral-500">{activeOrganization.name}</div>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-0.5">
            <Link href="/dashboard/settings/business" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-neutral-700 outline-none transition-all duration-75 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary/50" onClick={() => setOpenPopover(false)}>
              <Gear className="size-4 shrink-0 text-neutral-800" />
              <span className="text-sm">Settings</span>
            </Link>
            <Link href="/dashboard/settings/team" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-neutral-700 outline-none transition-all duration-75 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary/50" onClick={() => setOpenPopover(false)}>
              <UserPlus className="size-4 shrink-0 text-neutral-800" />
              <span className="text-sm">Invite members</span>
            </Link>
            {isProduction ? (
              <button type="button" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-neutral-700 outline-none transition-all duration-75 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary/50" onClick={() => setSandboxDialogOpen(true)}>
                <TestTubeDiagonal className="size-4 shrink-0 text-neutral-800" />
                <span className="text-sm">Switch to sandbox</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="px-2 py-2">
          <p className="px-2 pb-1 text-left text-xs font-medium text-neutral-500">
            Businesses
          </p>
          <div className="flex flex-col gap-0.5">
            {visibleOrganizations.map((organization) => (
              <BusinessListItem
                key={organization.id}
                organization={organization}
                isActive={organization.id === activeOrganization.id}
                disabled={isSwitching}
                onSelect={() => void selectOrganization(organization)}
              />
            ))}
            {hasMoreOrganizations ? (
              <Link
                href="/dashboard/businesses"
                onClick={() => setOpenPopover(false)}
                className="block rounded-md px-2 py-2 text-left text-sm font-medium text-primary hover:bg-neutral-100"
              >
                Show more
              </Link>
            ) : null}
          </div>
        </div>

        <div className="border-t border-neutral-200 p-1.5">
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-neutral-700 transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80" onClick={onCreateBusiness}>
            <Plus className="size-4 shrink-0 text-neutral-500" />
            <span className="text-sm">Create business</span>
          </button>
        </div>
      </div>

      <AppModal
        open={sandboxDialogOpen}
        onOpenChange={setSandboxDialogOpen}
        title="Switch to sandbox?"
        description="Sandbox mode uses test data and does not affect live mainnet payments. You can switch back to production anytime."
        footer={
          <>
            <Button type="button" variant="secondary" text="Cancel" className="h-9 w-fit" onClick={() => setSandboxDialogOpen(false)} />
            <Button type="button" variant="primary" text="Switch to sandbox" loading={isSwitchingToSandbox} className="h-9 w-fit" onClick={() => void handleSwitchToSandbox()} />
          </>
        }
      />
    </>
  );
}
