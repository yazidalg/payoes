import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  paymentLinks,
  payments,
  type Organization,
} from "@/lib/db/schema";
import type { PaymentsTab } from "@/constants/navigation/payments-tabs";
import { organizationEnvironmentWhere } from "@/lib/organizations/environment-scope";

export type PaymentsHubCounts = Record<PaymentsTab, number>;

export async function getPaymentsHubCounts(
  organizationId: string,
  environment: Organization["environment"],
): Promise<PaymentsHubCounts> {
  const [paymentIntentsCount, invoicesCount, paymentLinksCount] =
    await Promise.all([
    db
      .select({ count: count() })
      .from(payments)
      .where(
        organizationEnvironmentWhere(
          payments.organizationId,
          payments.environment,
          organizationId,
          environment,
        ),
      ),
    db
      .select({ count: count() })
      .from(invoices)
      .where(
        organizationEnvironmentWhere(
          invoices.organizationId,
          invoices.environment,
          organizationId,
          environment,
        ),
      ),
    db
      .select({ count: count() })
      .from(paymentLinks)
      .where(
        organizationEnvironmentWhere(
          paymentLinks.organizationId,
          paymentLinks.environment,
          organizationId,
          environment,
        ),
      ),
  ]);

  return {
    "payment-intents": paymentIntentsCount[0]?.count ?? 0,
    invoices: invoicesCount[0]?.count ?? 0,
    "payment-links": paymentLinksCount[0]?.count ?? 0,
  };
}
