"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Popover } from "@dub/ui";
import {
  CreditCard,
  Hyperlink,
  InvoiceDollar,
  Plus2,
} from "@dub/ui/icons";
import { ChevronDown } from "lucide-react";
import { CreatePaymentDialog } from "@/components/payments/create-payment-dialog";

const createOptions = [
  {
    id: "invoices",
    label: "Invoice",
    description: "Collect a one-time payment from a specific customer.",
    icon: InvoiceDollar,
    action: "navigate" as const,
    href: "/dashboard/payments/invoices/new",
  },
  {
    id: "payment-links",
    label: "Payment link",
    description: "Share a reusable link that starts checkout on each visit.",
    icon: Hyperlink,
    action: "navigate" as const,
    href: "/dashboard/payments/links/new",
  },
  {
    id: "payment-intents",
    label: "Manual payment",
    description: "Record a payment received outside hosted checkout.",
    icon: CreditCard,
    action: "dialog" as const,
  },
] as const;

export function DashboardQuickActions({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  return (
    <>
      <Popover
        openPopover={open}
        setOpenPopover={setOpen}
        align="end"
        content={
          <div className="w-80 p-1">
            {createOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-100"
                onClick={() => {
                  setOpen(false);

                  if (option.action === "navigate") {
                    router.push(option.href);
                    return;
                  }

                  setPaymentOpen(true);
                }}
              >
                <option.icon className="mt-0.5 size-4 shrink-0 text-neutral-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-neutral-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        }
      >
        <Button
          type="button"
          variant="primary"
          text="Create payment"
          icon={<Plus2 className="size-4" />}
          right={<ChevronDown className="size-4 opacity-70" />}
          className="h-9 w-fit"
        />
      </Popover>

      <CreatePaymentDialog
        organizationId={organizationId}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onCreated={(paymentId) => {
          router.push(`/dashboard/payments/${paymentId}`);
        }}
      />
    </>
  );
}
