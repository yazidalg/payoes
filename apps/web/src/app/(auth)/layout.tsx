import type React from "react";
import { OnboardingLayout } from "@/components/layouts/onboarding-layout";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OnboardingLayout>{children}</OnboardingLayout>;
}
