"use client";

import { motion } from "motion/react";
import { cn } from "@dub/utils";

export type CheckoutAlertType = "info" | "error";

type CheckoutAlertBannerProps = {
  type: CheckoutAlertType;
  message: string;
};

const typeStyles: Record<CheckoutAlertType, string> = {
  error:
    "border-checkout-error-banner-border bg-checkout-error-banner text-checkout-error-banner-foreground",
  info: "border-checkout-info-banner-border bg-checkout-info-banner text-checkout-info-banner-foreground",
};

export function CheckoutAlertBanner({ type, message }: CheckoutAlertBannerProps) {
  return (
    <motion.div
      role="alert"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t px-4 py-3 text-center text-sm backdrop-blur-sm",
        typeStyles[type],
      )}
    >
      <p>{message}</p>
    </motion.div>
  );
}

export function CheckoutErrorBanner({ message }: { message: string }) {
  return <CheckoutAlertBanner type="error" message={message} />;
}
