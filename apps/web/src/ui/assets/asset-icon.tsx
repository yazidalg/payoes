"use client";

import { cn } from "@dub/utils";
import { Coins } from "lucide-react";
import { useState } from "react";
import { getAssetIconUrl, normalizeAssetCode } from "@/lib/assets/icons";

type AssetIconProps = {
  assetCode: string;
  className?: string;
};

function AssetIconFallback({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const initials = code === "UNKNOWN" ? null : code.slice(0, 4);

  return (
    <div
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold uppercase tracking-tight text-neutral-600 ring-1 ring-inset ring-neutral-200/80",
        className,
      )}
      role="img"
      aria-label={code}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <Coins className="size-3.5 text-neutral-500" aria-hidden />
      )}
    </div>
  );
}

export function AssetIcon({ assetCode, className }: AssetIconProps) {
  const code = normalizeAssetCode(assetCode);
  const iconUrl = getAssetIconUrl(assetCode);
  const [imageFailed, setImageFailed] = useState(false);

  if (!iconUrl || imageFailed) {
    return <AssetIconFallback code={code} className={className} />;
  }

  return (
    <img
      src={iconUrl}
      alt={code}
      className={cn("size-6 shrink-0 rounded-full object-cover", className)}
      onError={() => setImageFailed(true)}
    />
  );
}
