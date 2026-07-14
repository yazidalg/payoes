"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Organization } from "@/lib/db/schema";
import { getPrioritizedOrganizations } from "@/lib/organizations/list-utils";
import { useBusinessSwitch } from "@/hooks/use-business-switch";
import { Input } from "@/components/ui/input";
import { BusinessListItem } from "@/ui/business/business-list-item";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import { Button } from "@dub/ui";
import { Plus2 } from "@dub/ui/icons";
import { Search } from "lucide-react";

export function BusinessesPage({
  organizations,
}: {
  organizations: Organization[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { activeOrganization, switchOrganization, isSwitching } =
    useBusinessSwitch();

  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title: "Switch between workspaces or create a new business.",
      },
      controls: (
        <Button
          type="button"
          variant="primary"
          text="Create business"
          icon={<Plus2 className="size-4" />}
          className="h-9 w-fit"
          onClick={() => router.push("/business/new")}
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
          placeholder="Search businesses"
          className="h-10 pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {filteredOrganizations.length === 0 ? (
          <p className="px-4 py-8 text-left text-sm text-neutral-500">
            No businesses found.
          </p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {filteredOrganizations.map((organization) => (
              <BusinessListItem
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
          href="/business/new"
          className="font-medium text-primary hover:underline"
        >
          Create business
        </Link>
      </p>
    </div>
  );
}
