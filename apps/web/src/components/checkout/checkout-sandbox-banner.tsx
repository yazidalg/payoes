type CheckoutSandboxBannerProps = {
  onSimulate?: () => void;
  isSimulating?: boolean;
  simulateDisabled?: boolean;
};

export function CheckoutSandboxBanner({
  onSimulate,
  isSimulating = false,
  simulateDisabled = false,
}: CheckoutSandboxBannerProps) {
  const showSimulate = Boolean(onSimulate) && !simulateDisabled;

  return (
    <div
      role="status"
      className="relative z-10 border-b border-primary-foreground/10 bg-primary px-4 py-3 text-center text-sm text-primary-foreground backdrop-blur-sm"
    >
      <p>Sandbox test mode. No real funds will be transferred.</p>
      {showSimulate ? (
        <button
          type="button"
          className="mt-1 text-sm font-medium text-primary-foreground underline underline-offset-2 transition-colors hover:text-primary-foreground/80 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSimulating}
          onClick={onSimulate}
        >
          {isSimulating ? "Simulating payment..." : "Simulate successful payment"}
        </button>
      ) : null}
    </div>
  );
}
