import type { Organization } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

export type OrganizationLogoProps = {
  organization: Pick<Organization, "name" | "logoUrl"> & {
    logoInitials?: string;
    id?: string;
  };
  className?: string;
  iconClassName?: string;
};

export function OrganizationDefaultLogo({
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

export function OrganizationMark({
  organization,
  className,
  iconClassName,
}: OrganizationLogoProps) {
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
    <OrganizationDefaultLogo className={className} iconClassName={iconClassName} />
  );
}
