import { and, eq, type SQLWrapper } from "drizzle-orm";
import type { Organization } from "@/lib/db/schema";

export type OrganizationEnvironment = Organization["environment"];

export function organizationEnvironmentWhere(
  organizationIdColumn: SQLWrapper,
  environmentColumn: SQLWrapper,
  organizationId: string,
  environment: OrganizationEnvironment
) {
  return and(
    eq(organizationIdColumn, organizationId),
    eq(environmentColumn, environment)
  );
}

export function belongsToOrganizationEnvironment<
  T extends { organizationId: string; environment: OrganizationEnvironment },
>(row: T, organizationId: string, environment: OrganizationEnvironment) {
  return row.organizationId === organizationId && row.environment === environment;
}
