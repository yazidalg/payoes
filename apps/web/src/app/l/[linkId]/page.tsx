import Link from "next/link";
import { PaymentLinkHostedClient } from "@/components/payment-links/payment-link-hosted-client";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  getPublicPaymentLinkDetail,
  hasCustomerCollection,
  startCheckoutFromPaymentLink,
} from "@/lib/payment-links/service";
import { redirect } from "next/navigation";

export default async function PaymentLinkPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = await params;

  try {
    const link = await getPublicPaymentLinkDetail(linkId);

    if (!link) {
      redirect("/");
    }

    const showHostedPage =
      Boolean(link.currency_code) || hasCustomerCollection(link.customer_collection);

    if (!showHostedPage) {
      const result = await startCheckoutFromPaymentLink(linkId);

      if (!result) {
        redirect("/");
      }

      redirect(result.checkoutUrl);
    }

    return (
      <div className="min-h-svh bg-muted/30">
        <PaymentLinkHostedClient link={link} />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "This payment link cannot be opened right now.";

    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <AlertBlock type="error">{message}</AlertBlock>
          <p className="text-sm text-muted-foreground">
            If you manage this merchant account, configure and save your receiving
            wallet in Settings before sharing payment links.
          </p>
          <Button
            variant="outline"
            className="w-full"
            render={<Link href="/">Back to home</Link>}
          />
        </div>
      </div>
    );
  }
}
