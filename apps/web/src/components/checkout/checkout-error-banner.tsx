type CheckoutErrorBannerProps = {
  message: string;
};

export function CheckoutErrorBanner({ message }: CheckoutErrorBannerProps) {
  return (
    <div
      role="alert"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-checkout-error-banner-border bg-checkout-error-banner px-4 py-3 text-center text-sm text-checkout-error-banner-foreground backdrop-blur-sm"
    >
      <p>{message}</p>
    </div>
  );
}
