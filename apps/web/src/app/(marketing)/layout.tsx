import { cn } from "@/lib/utils";
import "./marketing.css";
import { inter, satoshi } from "./fonts";
import { Footer } from "./footer";
import { Nav } from "./nav";

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
        "marketing-theme flex min-h-screen flex-col justify-between",
      )}
    >
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
