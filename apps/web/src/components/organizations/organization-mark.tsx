import type { Organization } from "@/lib/db/schema";

export function OrganizationMark({
  organization,
  className,
}: {
  organization: Pick<Organization, "name" | "logoUrl" | "logoInitials">;
  className?: string;
}) {
  if (organization.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={organization.logoUrl}
        alt={`${organization.name} logo`}
        className={className}
      />
    );
  }

  return (
    <span className={className}>
      {organization.logoInitials || organization.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
