import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import {
  getCustomerForOrganization,
  listPaymentsForCustomer,
  serializeCustomer,
} from "@/lib/customers/service";
import { serializePayments } from "@/lib/payments/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiKeyAuth(request, async ({ apiKey }) => {
    const { id } = await params;
    const customer = await getCustomerForOrganization(
      id,
      apiKey.organizationId,
      apiKey.environment
    );

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const paymentList = await listPaymentsForCustomer(
      customer.id,
      apiKey.environment
    );

    return NextResponse.json({
      ...serializeCustomer(customer),
      payments: await serializePayments(paymentList),
    });
  });
}
