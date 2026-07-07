import { cn } from "@/lib/utils";

export function Logo({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"img">) {
  return (
    <img
      src="/logo.svg"
      alt="Payoes logo"
      className={cn("size-10", className)}
      {...props}
    />
  );
}
