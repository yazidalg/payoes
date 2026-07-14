import type { Organization } from "@/lib/db/schema";

export const DROPDOWN_ORGANIZATION_LIMIT = 3;

export function getPrioritizedOrganizations(
  organizations: Organization[],
  activeOrganizationId: string,
  limit?: number,
) {
  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrganizationId,
  );
  const otherOrganizations = organizations.filter(
    (organization) => organization.id !== activeOrganizationId,
  );

  const prioritized = activeOrganization
    ? [activeOrganization, ...otherOrganizations]
    : otherOrganizations;

  if (limit === undefined) {
    return prioritized;
  }

  return prioritized.slice(0, limit);
}
