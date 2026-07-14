import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { DEFAULT_AUTH_URL } from "@/constants/app";
import { startCheckoutFromPaymentLink } from "@/lib/payment-links/service";

function checkoutPathFromUrl(url: string) {
  return new URL(url, process.env.AUTH_URL ?? DEFAULT_AUTH_URL).pathname;
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;

  if (paymentId.startsWith("plink_")) {
    let result;

    try {
      result = await startCheckoutFromPaymentLink(paymentId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "This payment link cannot be opened right now.";
      const showSettlementWalletHint = message
        .toLowerCase()
        .includes("settlement wallet");

      return (
        <div className="flex min-h-svh items-center justify-center bg-neutral-50 p-6">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <AlertBlock type="error">{message}</AlertBlock>
            {showSettlementWalletHint ? (
              <p className="text-sm text-neutral-500">
                If you manage this merchant account, configure and save your settlement
                wallet in Settings before sharing payment links.
              </p>
            ) : null}
            <Button
              variant="outline"
              className="w-full"
              render={<Link href="/">Back to home</Link>}
            />
          </div>
        </div>
      );
    }

    if (!result) {
      redirect("/");
    }

    redirect(checkoutPathFromUrl(result.checkoutUrl));
  }

  return <CheckoutClient paymentId={paymentId} />;
}
