export function CheckoutSandboxBanner() {
  return (
    <div
      role="status"
      className="relative z-10 border-b border-sandbox-banner-border bg-sandbox-banner px-4 py-3 text-center text-sm text-sandbox-banner-foreground backdrop-blur-sm"
    >
      <p>Transactions on this checkout are recorded on Testnet.</p>
    </div>
  );
}
