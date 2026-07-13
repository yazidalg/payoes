"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateCheckoutSessionDialog } from "@/components/payments/create-checkout-session-dialog";
import { CreatePaymentDialog } from "@/components/payments/create-payment-dialog";
import { Button, Popover } from "@dub/ui";
import {
  CreditCard,
  Hyperlink,
  InvoiceDollar,
  Plus2,
  Receipt2,
} from "@dub/ui/icons";
import { ChevronDown } from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";

type CreatePaymentMenuProps = {
  organizationId: string;
  onCreated?: () => void;
  includeCheckoutSession?: boolean;
  buttonText?: string;
  buttonIcon?: ReactNode;
};

type CreateOption = {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  action: "navigate" | "checkout-session" | "manual-payment";
  href?: string;
};

const baseCreateOptions: CreateOption[] = [
  {
    id: "invoices",
    label: "Invoice",
    description: "Collect a one-time payment from a specific customer.",
    icon: InvoiceDollar,
    action: "navigate",
    href: "/dashboard/payments/invoices/new",
  },
  {
    id: "payment-links",
    label: "Payment link",
    description: "Share a reusable link that starts checkout on each visit.",
    icon: Hyperlink,
    action: "navigate",
    href: "/dashboard/payments/links/new",
  },
  {
    id: "payment-intents",
    label: "Manual payment",
    description: "Record a payment received outside hosted checkout.",
    icon: CreditCard,
    action: "manual-payment",
  },
];

const checkoutSessionOption: CreateOption = {
  id: "checkout-sessions",
  label: "Checkout session",
  description: "Create a hosted checkout session with a payment intent.",
  icon: Receipt2,
  action: "checkout-session",
};

export function CreatePaymentMenu({
  organizationId,
  onCreated,
  includeCheckoutSession = false,
  buttonText = "Create payment",
  buttonIcon = <Plus2 className="size-4" />,
}: CreatePaymentMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [checkoutSessionOpen, setCheckoutSessionOpen] = useState(false);

  const createOptions = includeCheckoutSession
    ? [
        baseCreateOptions[0]!,
        baseCreateOptions[1]!,
        checkoutSessionOption,
        baseCreateOptions[2]!,
      ]
    : baseCreateOptions;

  function handleCreated(detailPath: string) {
    onCreated?.();
    router.push(detailPath);
  }

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

                  if (option.action === "navigate" && option.href) {
                    router.push(option.href);
                    return;
                  }

                  if (option.action === "checkout-session") {
                    setCheckoutSessionOpen(true);
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
          text={buttonText}
          icon={buttonIcon}
          right={<ChevronDown className="size-4 opacity-70" />}
          className="h-9 w-fit"
        />
      </Popover>

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

      {includeCheckoutSession ? (
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
      ) : null}
    </>
  );
}
