import type { StatusBadge } from "@dub/ui";
import type { ComponentProps } from "react";

type StatusBadgeVariant = NonNullable<
  ComponentProps<typeof StatusBadge>["variant"]
>;

export const API_LOGS_PAGE_SIZE = 20;

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export const HTTP_STATUS_GROUPS = [
  { value: "2xx", label: "2xx Success" },
  { value: "4xx", label: "4xx Client error" },
  { value: "5xx", label: "5xx Server error" },
] as const;

export const METHOD_BADGE_VARIANTS: Record<string, StatusBadgeVariant> = {
  POST: "new",
  PATCH: "warning",
  PUT: "pending",
  DELETE: "error",
  GET: "success",
};
