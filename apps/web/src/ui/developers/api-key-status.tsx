import type { ApiKeyRow } from "@/lib/api-keys/types";
import { cn } from "@dub/utils";

export function ApiKeyStatus({ apiKey }: { apiKey: Pick<ApiKeyRow, "revokedAt"> }) {
  const isRevoked = Boolean(apiKey.revokedAt);

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        isRevoked
          ? "bg-red-100 text-red-500"
          : "bg-green-100 text-green-600",
      )}
    >
      {isRevoked ? "Revoked" : "Active"}
    </span>
  );
}
