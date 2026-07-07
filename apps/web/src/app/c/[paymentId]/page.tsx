import { CheckoutClient } from "@/components/checkout/checkout-client";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  return <CheckoutClient paymentId={paymentId} />;
}
