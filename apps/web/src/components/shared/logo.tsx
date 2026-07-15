import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_HEIGHT = 32;
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 2294) / 848);

export function Logo({
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof Image>, "src" | "alt" | "width" | "height">) {
  return (
    <Image
      src="/logo-full.png"
      alt="Payoes"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={cn("h-8 w-auto object-contain", className)}
      {...props}
    />
  );
}
