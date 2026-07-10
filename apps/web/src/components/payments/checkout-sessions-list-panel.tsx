"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { CreateCheckoutSessionDialog } from "@/components/payments/create-checkout-session-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatAssetAmount, type CheckoutSessionRow } from "@/lib/payments/types";
import { TableEmptyState } from "@/ui/shared/table-empty-state";
import { CreditCard } from "@dub/ui/icons";

export function CheckoutSessionsListPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    const response = await fetch(
      `/api/organizations/${organizationId}/checkout-sessions`
    );
    const data = (await response.json()) as {
      checkout_sessions?: CheckoutSessionRow[];
    };
    return data.checkout_sessions ?? [];
  }, [organizationId]);

  const { data: sessions, reload } = useAsyncData(fetchSessions, [organizationId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Checkout Sessions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create hosted checkout sessions that spawn a payment intent.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon />
          Create session
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session list</CardTitle>
          <CardDescription>
            Click a session ID to open the detail page.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {(sessions ?? []).length === 0 ? (
            <TableEmptyState
              title="No checkout sessions yet"
              description="Create a checkout session to start accepting payments."
              icon={<CreditCard className="size-4 text-neutral-700" />}
              className="border-0"
            />
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Session</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Payment intent</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(sessions ?? []).map((session) => (
                    <tr
                      key={session.id}
                      className="border-t border-border/60 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/dashboard/payments/checkout-sessions/${session.id}`}
                          className="font-medium hover:underline"
                        >
                          {session.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {session.amount
                          ? formatAssetAmount(session.amount, session.settlement_asset)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {session.payment_intent_id ? (
                          <Link
                            href={`/dashboard/payments/${session.payment_intent_id}`}
                            className="hover:underline"
                          >
                            {session.payment_intent_id}
                          </Link>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">{session.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCheckoutSessionDialog
        organizationId={organizationId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(sessionId) => {
          reload();
          if (sessionId) {
            router.push(`/dashboard/payments/checkout-sessions/${sessionId}`);
          }
        }}
      />
    </div>
  );
}
