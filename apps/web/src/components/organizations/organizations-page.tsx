"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Organization } from "@/lib/db/schema";
import { getPrioritizedOrganizations } from "@/lib/organizations/list-utils";
import { useOrganizationSwitch } from "@/hooks/use-organization-switch";
import { Input } from "@/components/ui/input";
import { OrganizationListItem } from "@/ui/organizations/organization-list-item";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import { Button } from "@dub/ui";
import { Plus2 } from "@dub/ui/icons";
import { Search } from "lucide-react";

export function OrganizationsPage({
  organizations,
}: {
  organizations: Organization[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { activeOrganization, switchOrganization, isSwitching } =
    useOrganizationSwitch();

  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title: "Switch between workspaces or create a new organization.",
      },
      controls: (
        <Button
          type="button"
          variant="primary"
          text="Create organization"
          icon={<Plus2 className="size-4" />}
          className="h-9 w-fit"
          onClick={() => router.push("/organizations/new")}
        />
      ),
    }),
    [router],
  );

  useSetDashboardPageHeader(headerOverride);

  const filteredOrganizations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return getPrioritizedOrganizations(
        organizations,
        activeOrganization?.id ?? "",
      );
    }

    return organizations.filter((organization) =>
      organization.name.toLowerCase().includes(query),
    );
  }, [activeOrganization?.id, organizations, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search organizations"
          className="h-10 pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {filteredOrganizations.length === 0 ? (
          <p className="px-4 py-8 text-left text-sm text-neutral-500">
            No organizations found.
          </p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {filteredOrganizations.map((organization) => (
              <OrganizationListItem
                key={organization.id}
                organization={organization}
                isActive={organization.id === activeOrganization?.id}
                disabled={isSwitching}
                className="rounded-none px-4 py-3"
                onSelect={() =>
                  void switchOrganization(organization, {
                    onSuccess: () => router.push("/dashboard/payments"),
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-left text-sm text-neutral-500">
        Need another workspace?{" "}
        <Link
          href="/organizations/new"
          className="font-medium text-primary hover:underline"
        >
          Create organization
        </Link>
      </p>
    </div>
  );
}
