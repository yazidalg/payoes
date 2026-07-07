import { AppIcon } from "@/components/ui/app-icon";
import { getDashboardPageTitle } from "@/lib/navigation/dashboard-nav";
import type { LucideIcon } from "lucide-react";
import { BarChart3 } from "lucide-react";

export function SectionPlaceholder({
  title,
  description,
  icon = BarChart3,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center transition-colors duration-200">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border/60">
        <AppIcon icon={icon} className="size-5 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-medium tracking-tight">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description ??
          "This section is ready in the navigation. Implementation coming soon."}
      </p>
    </div>
  );
}

export function DashboardSectionPage({ pathname }: { pathname: string }) {
  const title = getDashboardPageTitle(pathname);

  return <SectionPlaceholder title={title} />;
}
