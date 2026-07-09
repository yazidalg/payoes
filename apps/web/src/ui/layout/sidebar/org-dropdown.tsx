"use client";

import { OrganizationMark } from "@/components/organizations/organization-mark";
import type { Organization } from "@/lib/db/schema";
import { getHubPathAfterOrganizationSwitch } from "@/lib/navigation/org-switch-redirect";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { Popover, useScrollProgress } from "@dub/ui";
import { Check2, Gear, Plus, UserPlus } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useAddOrganizationModal } from "@/ui/modals/add-organization-modal";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function OrgDropdown({
  placement = "switcher",
}: {
  placement?: "switcher" | "sidebar-bottom";
}) {
  const { organizations, activeOrganization } = useDashboardShell();
  const [openPopover, setOpenPopover] = useState(false);
  const { setShowAddOrganizationModal, AddOrganizationModal } =
    useAddOrganizationModal();

  if (!activeOrganization) {
    return <OrgDropdownPlaceholder placement={placement} />;
  }

  const isSidebarBottom = placement === "sidebar-bottom";

  return (
    <>
      <AddOrganizationModal />
      <div className={cn(isSidebarBottom && "w-full")}>
      <Popover
        content={
          <OrgList
            organizations={organizations}
            activeOrganization={activeOrganization}
            setOpenPopover={setOpenPopover}
            onCreateOrganization={() => {
              setOpenPopover(false);
              setShowAddOrganizationModal(true);
            }}
          />
        }
        side={isSidebarBottom ? "top" : "right"}
        align="start"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        {isSidebarBottom ? (
          <button
            type="button"
            onClick={() => setOpenPopover(!openPopover)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-all duration-75",
              "hover:bg-bg-inverted/5 active:bg-bg-inverted/10 data-[state=open]:bg-bg-inverted/10",
              "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-900 text-xs font-semibold text-white">
              <OrganizationMark
                organization={activeOrganization}
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-neutral-900">
                {activeOrganization.name}
              </div>
              <div className="truncate text-xs capitalize text-neutral-500">
                {activeOrganization.environment} workspace
              </div>
            </div>
            <ChevronDown className="size-4 shrink-0 text-neutral-400" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpenPopover(!openPopover)}
            className={cn(
              "flex size-11 items-center justify-center rounded-lg p-1.5 text-left text-sm transition-all duration-75",
              "hover:bg-bg-inverted/5 active:bg-bg-inverted/10 data-[state=open]:bg-bg-inverted/10",
              "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
            )}
          >
            <div className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-neutral-900 text-xs font-semibold text-white">
              <OrganizationMark
                organization={activeOrganization}
                className="size-full object-cover"
              />
            </div>
          </button>
        )}
      </Popover>
      </div>
    </>
  );
}

function OrgDropdownPlaceholder({
  placement = "switcher",
}: {
  placement?: "switcher" | "sidebar-bottom";
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-neutral-300",
        placement === "sidebar-bottom" ? "h-12 w-full" : "size-11",
      )}
    />
  );
}

function OrgList({
  organizations,
  activeOrganization,
  setOpenPopover,
  onCreateOrganization,
}: {
  organizations: Organization[];
  activeOrganization: Organization;
  setOpenPopover: (open: boolean) => void;
  onCreateOrganization: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { setActiveOrganization } = useDashboardShell();
  const [isSwitching, setIsSwitching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  async function selectOrganization(organization: Organization) {
    if (organization.id === activeOrganization.id || isSwitching) {
      return;
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
        toast.error(data.error ?? "Unable to switch organization");
        return;
      }

      setActiveOrganization(data.organization);
      setOpenPopover(false);

      const hubPath = getHubPathAfterOrganizationSwitch(pathname);
      if (hubPath) {
        router.push(hubPath);
      }

      router.refresh();
    } catch {
      toast.error("Unable to switch organization");
    } finally {
      setIsSwitching(false);
    }
  }

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        onScroll={updateScrollProgress}
        className="w-xs max-h-84 relative w-full overflow-auto rounded-xl bg-white text-base sm:w-72 sm:text-sm"
      >
        <div className="flex flex-col gap-2.5 border-b border-neutral-200 px-3 pb-3 sm:p-3">
          <div className="flex items-center gap-x-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-900 text-sm font-semibold text-white sm:size-8">
              <OrganizationMark
                organization={activeOrganization}
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-medium leading-5 text-neutral-900 sm:text-sm">
                {activeOrganization.name}
              </div>
              <div className="truncate text-sm capitalize leading-tight text-neutral-500 sm:text-xs">
                {activeOrganization.environment} workspace
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-1">
            <Link
              href="/dashboard/settings/organization"
              className="flex items-center justify-start gap-x-2 rounded-lg border border-neutral-200 px-2 py-1 text-neutral-700 outline-none transition-all duration-75 hover:bg-neutral-100/50 focus-visible:ring-2 focus-visible:ring-black/50 active:bg-neutral-200/80"
              onClick={() => setOpenPopover(false)}
            >
              <Gear className="size-4 text-neutral-800" />
              <span className="block truncate text-sm">Settings</span>
            </Link>
            <Link
              href="/dashboard/settings/team"
              className="flex items-center justify-start gap-x-2 rounded-lg border border-neutral-200 px-2 py-1 text-neutral-700 outline-none transition-all duration-75 hover:bg-neutral-100/50 focus-visible:ring-2 focus-visible:ring-black/50 active:bg-neutral-200/80"
              onClick={() => setOpenPopover(false)}
            >
              <UserPlus className="size-4 text-neutral-800" />
              <span className="block truncate text-sm">Invite members</span>
            </Link>
          </div>
        </div>

        <div className="p-1">
          <p className="px-2 py-2 text-xs font-medium text-neutral-500">
            Organizations
          </p>
          <div className="flex flex-col gap-0.5">
            {organizations.map((organization) => {
              const isActive = organization.id === activeOrganization.id;

              return (
                <button
                  key={organization.id}
                  type="button"
                  disabled={isSwitching}
                  className={cn(
                    "relative flex w-full items-center gap-x-2 rounded-md px-2 py-2 transition-all duration-75",
                    "hover:bg-neutral-200/50 active:bg-neutral-200/80",
                    "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
                    isActive && "bg-neutral-200/50",
                  )}
                  onClick={() => void selectOrganization(organization)}
                >
                  <div className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
                    <OrganizationMark
                      organization={organization}
                      className="size-full object-cover"
                    />
                  </div>
                  <span className="block truncate text-base leading-5 text-neutral-900 sm:max-w-[140px] sm:text-sm">
                    {organization.name}
                  </span>
                  {isActive ? (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
                      <Check2 className="size-4" aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              );
            })}
            <button
              type="button"
              className="group flex w-full cursor-pointer items-center gap-x-2.5 rounded-md p-2 text-neutral-700 transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80"
              onClick={onCreateOrganization}
            >
              <Plus className="ml-0.5 size-4 text-neutral-500" />
              <span className="block truncate">Create organization</span>
            </button>
          </div>
        </div>
      </div>
      <div
        className="pointer-events-none absolute -bottom-px left-0 h-16 w-full rounded-b-lg bg-gradient-to-t from-white sm:bottom-0"
        style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
      />
    </div>
  );
}
