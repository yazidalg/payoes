import type React from "react";
import { Logo } from "@/components/shared/logo";

interface Props {
  children: React.ReactNode;
}

export function OnboardingLayout({ children }: Props) {
  return (
    <div className="container relative flex min-h-svh w-full flex-col items-center justify-center lg:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col border-r border-border p-10 lg:flex">
        <div className="absolute inset-0 bg-muted" />
        <div className="relative z-20 flex items-center text-lg font-medium text-foreground">
          <Logo className="h-10 w-auto" />
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg text-foreground">
              &ldquo;Stellar payment infrastructure for modern apps. Accept,
              send, and manage digital assets from one platform.&rdquo;
            </p>
            <footer className="text-sm text-muted-foreground">Payoes</footer>
          </blockquote>
        </div>
      </div>

      <div className="w-full">
        <div className="relative mx-auto flex w-full max-w-lg flex-col justify-center space-y-6 p-6 lg:p-10">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <Logo className="h-10 w-auto" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
