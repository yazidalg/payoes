import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof Image>, "src" | "alt" | "width" | "height">) {
  return (
    <Image
      src="/logo.svg"
      alt="Payoes logo"
      width={40}
      height={40}
      className={cn("size-10", className)}
      {...props}
    />
  );
}
