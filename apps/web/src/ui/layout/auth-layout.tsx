import { ClientOnly } from "@dub/ui";
import { cn } from "@dub/utils";
import { PropsWithChildren, Suspense } from "react";
import { authPageFooterClass } from "@/ui/auth/auth-styles";

export const AuthLayout = ({
  showTerms,
  className,
  children,
}: PropsWithChildren<{
  showTerms?: boolean;
  className?: string;
}>) => {
  return (
    <div
      className={cn(
        "flex min-h-[100dvh] w-full flex-col items-center justify-between",
        className,
      )}
    >
      <div className="grow basis-0">
        <div className="h-24" />
      </div>

      <ClientOnly className="relative flex w-full flex-col items-center justify-center px-4">
        <Suspense>{children}</Suspense>
      </ClientOnly>

      <div className="flex grow basis-0 flex-col justify-end">
        {showTerms ? (
          <p className={cn(authPageFooterClass, "px-20 py-8 md:px-0")}>
            By continuing, you agree to Payoes&apos;s Terms of Service and
            Privacy Policy.
          </p>
        ) : null}
      </div>
    </div>
  );
};
