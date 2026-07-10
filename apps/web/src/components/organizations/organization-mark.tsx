import type { Organization } from "@/lib/db/schema";
import { Avatar } from "@dub/ui";

export function OrganizationMark({
  organization,
  className,
}: {
  organization: Pick<Organization, "name" | "logoUrl" | "logoInitials"> & {
    id?: string;
  };
  className?: string;
}) {
  return (
    <Avatar
      imageUrl={organization.logoUrl}
      identifier={organization.id ?? organization.name}
      className={className}
    />
  );
}
