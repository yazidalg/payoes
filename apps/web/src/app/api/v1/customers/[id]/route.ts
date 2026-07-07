import { NextResponse } from "next/server";
import { withApiKeyAuth } from "@/lib/api-keys/auth";
import {
  getCustomerByPublicId,
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
    const customer = await getCustomerByPublicId(id);

    if (!customer || customer.organizationId !== apiKey.organizationId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const paymentList = await listPaymentsForCustomer(customer.id);

    return NextResponse.json({
      ...serializeCustomer(customer),
      payments: await serializePayments(paymentList),
    });
  });
}
