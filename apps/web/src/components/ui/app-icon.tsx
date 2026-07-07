import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AppIconProps = {
  icon: LucideIcon;
  className?: string;
};

export function AppIcon({ icon: Icon, className }: AppIconProps) {
  return (
    <Icon
      className={cn(
        "size-[18px] shrink-0 transition-colors duration-150 ease-out",
        className
      )}
      strokeWidth={2}
      absoluteStrokeWidth
    />
  );
}
