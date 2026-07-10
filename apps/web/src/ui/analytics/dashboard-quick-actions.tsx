"use client";

import { CreatePaymentMenu } from "@/components/payments/create-payment-menu";

export function DashboardQuickActions({
  organizationId,
}: {
  organizationId: string;
}) {
  return <CreatePaymentMenu organizationId={organizationId} />;
}
