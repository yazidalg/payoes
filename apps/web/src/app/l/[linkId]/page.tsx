import Link from "next/link";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import { startCheckoutFromPaymentLink } from "@/lib/payment-links/service";
import { redirect } from "next/navigation";

export default async function PaymentLinkRedirectPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = await params;

  try {
    const result = await startCheckoutFromPaymentLink(linkId);

    if (!result) {
      redirect("/");
    }

    redirect(result.checkoutUrl);
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
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }
}
