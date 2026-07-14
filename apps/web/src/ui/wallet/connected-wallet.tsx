import { cn } from "@dub/utils";

function formatWalletAddress(address: string) {
  if (address.length <= 16) {
    return address;
  }

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function ConnectedWallet({
  address,
  networkLabel,
  className,
  compact = false,
}: {
  address: string;
  networkLabel: string;
  className?: string;
  compact?: boolean;
}) {
  const displayAddress = compact ? formatWalletAddress(address) : address;

  return (
    <p
      className={cn("text-xs text-neutral-500", className)}
      title={compact ? address : undefined}
    >
      {networkLabel} wallet{" "}
      <span className="font-mono text-neutral-700">{displayAddress}</span>
    </p>
  );
}
