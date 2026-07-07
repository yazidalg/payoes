import type React from "react";
import { redirect } from "next/navigation";

export default function WalletOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  redirect("/dashboard/payments");
  return children;
}
