import type { StatusBadge } from "@dub/ui";
import type { ComponentProps } from "react";

type StatusBadgeVariant = NonNullable<
  ComponentProps<typeof StatusBadge>["variant"]
>;

export function getStatusCodeBadgeVariant(
  statusCode: number,
): StatusBadgeVariant {
  if (statusCode >= 200 && statusCode < 300) {
    return "success";
  }

  if (statusCode >= 400 && statusCode < 500) {
    return "error";
  }

  return "error";
}
