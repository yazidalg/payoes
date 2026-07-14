import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Ported from the reference (dub) button variants, with its semantic color
// tokens resolved to their concrete neutral values.
export const buttonVariants = cva("transition-all", {
  variants: {
    variant: {
      primary:
        "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-4 hover:ring-primary/20",
      secondary:
        "border-neutral-200 bg-white text-neutral-900 outline-none hover:bg-neutral-50 focus-visible:border-neutral-400 data-[state=open]:border-neutral-400 data-[state=open]:ring-4 data-[state=open]:ring-neutral-200",
      outline: "border-transparent text-neutral-600 hover:bg-neutral-900/5",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

export function ButtonLink({
  variant,
  className,
  ...rest
}: VariantProps<typeof buttonVariants> & ComponentProps<typeof Link>) {
  return (
    <Link
      {...rest}
      className={cn(
        "flex h-10 w-fit items-center whitespace-nowrap rounded-lg border px-5 text-base font-medium",
        buttonVariants({ variant }),
        className,
      )}
    />
  );
}
