import { cn } from "@dub/utils";
import type { PropsWithChildren, ReactNode } from "react";

export function KycStepPage({
  children,
  title,
  description,
  className,
}: PropsWithChildren<{
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}>) {
  return (
    <div
        className={cn(
        "mx-auto flex w-full max-w-xl flex-col",
        "animate-slide-up-fade [--offset:10px] [animation-duration:1s] [animation-fill-mode:both]",
        className,
      )}
    >
      <h1 className="text-2xl font-medium leading-tight text-neutral-900">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm text-neutral-500">{description}</p>
      ) : null}
      <div className="mt-8 w-full">{children}</div>
    </div>
  );
}
