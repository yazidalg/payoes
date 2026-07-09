"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateCustomerSheet } from "@/components/customers/create-customer-sheet";
import { CustomersTable } from "@/ui/customers/customers-table";
import { useSetDashboardPageHeader } from "@/ui/layout/dashboard-page-header-context";
import { Button } from "@dub/ui";
import { Plus2 } from "@dub/ui/icons";

export function CustomersListPanel({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const headerOverride = useMemo(
    () => ({
      titleInfo: {
        title:
          "Browse payer profiles and payment history. Customers are also created automatically after checkout.",
        href: "/dashboard/developers/documentation",
      },
      controls: (
        <Button
          type="button"
          variant="primary"
          text="Create customer"
          icon={<Plus2 className="size-4" />}
          className="h-9 w-fit"
          onClick={() => setIsCreateOpen(true)}
        />
      ),
    }),
    [],
  );

  useSetDashboardPageHeader(headerOverride);

  return (
    <>
      <CustomersTable organizationId={organizationId} refreshKey={refreshKey} />

      <CreateCustomerSheet
        organizationId={organizationId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(customerId) => {
          setRefreshKey((current) => current + 1);
          if (customerId) {
            router.push(`/dashboard/customers/${customerId}`);
          }
        }}
      />
    </>
  );
}
