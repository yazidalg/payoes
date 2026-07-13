import { cn } from "@dub/utils";
import { CheckCircle2 } from "lucide-react";

export function ConnectedWallet({
  address,
  networkLabel,
  className,
}: {
  address: string;
  networkLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3",
        className
      )}
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-neutral-500">{networkLabel} wallet</p>
        <p className="mt-0.5 break-all font-mono text-xs text-neutral-800">
          {address}
        </p>
      </div>
    </div>
  );
}
