import { redirect } from "next/navigation";
import { getCheckoutSessionUrl } from "@/lib/checkout-sessions/service";
import { startCheckoutFromPaymentLink } from "@/lib/payment-links/service";

export default async function PaymentLinkRedirectPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = await params;
  const result = await startCheckoutFromPaymentLink(linkId);

  if (!result) {
    redirect("/");
  }

  redirect(getCheckoutSessionUrl(result.session.publicId));
}
