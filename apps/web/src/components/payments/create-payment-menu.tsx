"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  CreditCardIcon,
  FileTextIcon,
  Link2Icon,
  ShoppingCartIcon,
} from "lucide-react";
import { CreateCheckoutSessionDialog } from "@/components/payments/create-checkout-session-dialog";
import { CreatePaymentDialog } from "@/components/payments/create-payment-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@dub/ui";
import { Plus2 } from "@dub/ui/icons";

type CreatePaymentMenuProps = {
  organizationId: string;
  onCreated?: () => void;
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
    id: "checkout-sessions",
    tab: "checkout-sessions" as const,
    label: "Checkout session",
    description: "Create a hosted checkout session with a payment intent.",
    icon: ShoppingCartIcon,
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
  const [checkoutSessionOpen, setCheckoutSessionOpen] = useState(false);

  function handleCreated(detailPath: string) {
    onCreated?.();
    router.push(detailPath);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="primary"
              text="Create payment"
              icon={<Plus2 className="size-4" />}
              className="h-9 w-fit gap-1"
              right={
                <ChevronDownIcon className="size-4 opacity-70" aria-hidden />
              }
            />
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
                } else if (option.id === "checkout-sessions") {
                  setCheckoutSessionOpen(true);
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
          if (paymentId) {
            handleCreated(`/dashboard/payments/${paymentId}`);
          } else {
            onCreated?.();
          }
        }}
      />

      <CreateCheckoutSessionDialog
        organizationId={organizationId}
        open={checkoutSessionOpen}
        onOpenChange={setCheckoutSessionOpen}
        onCreated={(sessionId) => {
          if (sessionId) {
            handleCreated(
              `/dashboard/payments/checkout-sessions/${sessionId}`,
            );
          } else {
            onCreated?.();
          }
        }}
      />
    </>
  );
}
