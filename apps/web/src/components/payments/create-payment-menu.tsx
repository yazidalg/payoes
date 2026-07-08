"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  CreditCardIcon,
  FileTextIcon,
  Link2Icon,
  PlusIcon,
} from "lucide-react";
import { CreatePaymentDialog } from "@/components/payments/create-payment-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PaymentsTab } from "@/lib/navigation/payments-tabs";

type CreatePaymentMenuProps = {
  organizationId: string;
  onCreated?: (tab: PaymentsTab) => void;
};

const createOptions = [
  {
    id: "invoices",
    tab: "invoices" as const,
    label: "Invoice",
    description: "Collect a one-time payment from a specific customer.",
    icon: FileTextIcon,
  },
  {
    id: "payment-links",
    tab: "payment-links" as const,
    label: "Payment link",
    description: "Share a reusable link that starts checkout on each visit.",
    icon: Link2Icon,
  },
  {
    id: "payment-intents",
    tab: "payment-intents" as const,
    label: "Manual payment",
    description: "Record a payment received outside hosted checkout.",
    icon: CreditCardIcon,
  },
] as const;

export function CreatePaymentMenu({
  organizationId,
  onCreated,
}: CreatePaymentMenuProps) {
  const router = useRouter();
  const [paymentOpen, setPaymentOpen] = useState(false);

  function handleCreated(tab: PaymentsTab, resourceId: string, detailPath: string) {
    onCreated?.(tab);

    if (resourceId) {
      router.push(detailPath);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button">
              <PlusIcon />
              Create payment
              <ChevronDownIcon className="size-4 opacity-70" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-80 p-1">
          {createOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              className="items-start gap-3 rounded-lg px-2 py-2"
              onClick={() => {
                if (option.id === "invoices") {
                  router.push("/dashboard/payments/invoices/new");
                } else if (option.id === "payment-links") {
                  router.push("/dashboard/payments/links/new");
                } else {
                  setPaymentOpen(true);
                }
              }}
            >
              <option.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePaymentDialog
        organizationId={organizationId}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onCreated={(paymentId) => {
          handleCreated(
            "payment-intents",
            paymentId,
            `/dashboard/payments/${paymentId}`
          );
        }}
      />
    </>
  );
}
