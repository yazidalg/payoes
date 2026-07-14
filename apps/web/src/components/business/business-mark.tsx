import type { Organization } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

export type BusinessLogoProps = {
  organization: Pick<Organization, "name" | "logoUrl"> & {
    logoInitials?: string;
    id?: string;
  };
  className?: string;
  iconClassName?: string;
};

export function BusinessDefaultLogo({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500",
        className,
      )}
    >
      <Building2
        className={cn(
          "size-[40%] min-h-3 min-w-3 max-h-6 max-w-6",
          iconClassName,
        )}
      />
    </div>
  );
}

export function BusinessMark({
  organization,
  className,
  iconClassName,
}: BusinessLogoProps) {
  if (organization.logoUrl) {
    return (
      <img
        src={organization.logoUrl}
        alt=""
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <BusinessDefaultLogo className={className} iconClassName={iconClassName} />
  );
}
