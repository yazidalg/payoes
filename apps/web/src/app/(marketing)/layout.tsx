import { cn } from "@/lib/utils";
import "./marketing.css";
import { inter, satoshi } from "./fonts";
import { MarketingChrome } from "./marketing-chrome";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        satoshi.variable,
        inter.variable,
        "marketing-theme font-default flex min-h-screen flex-col justify-between bg-neutral-50/80",
      )}
    >
      <MarketingChrome>{children}</MarketingChrome>
    </div>
  );
}
