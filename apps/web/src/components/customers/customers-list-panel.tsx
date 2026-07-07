"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsyncData } from "@/hooks/use-async-data";
import type { CustomerRow } from "@/lib/customers/types";
import { formatCustomerLabel } from "@/lib/customers/types";

export function CustomersListPanel({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchCustomers = useCallback(async () => {
    const response = await fetch(`/api/organizations/${organizationId}/customers`);
    const data = (await response.json()) as { customers?: CustomerRow[] };
    return data.customers ?? [];
  }, [organizationId]);

  const { data: customers, reload } = useAsyncData(fetchCustomers, [organizationId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse payer profiles. Customers are also created automatically after
            checkout.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon />
          Create customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer list</CardTitle>
          <CardDescription>
            Click a row to open the customer detail page.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Wallet</th>
                  <th className="px-4 py-3 font-medium">ID</th>
                </tr>
              </thead>
              <tbody>
                {(customers ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No customers yet.
                    </td>
                  </tr>
                ) : (
                  (customers ?? []).map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-t border-border/60 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="hover:underline"
                        >
                          {formatCustomerLabel(customer)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.email ?? "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {customer.primary_stellar_address
                          ? `${customer.primary_stellar_address.slice(0, 10)}...`
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{customer.id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateCustomerDialog
        organizationId={organizationId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(customerId) => {
          reload();
          if (customerId) {
            router.push(`/dashboard/customers/${customerId}`);
          }
        }}
      />
    </div>
  );
}
