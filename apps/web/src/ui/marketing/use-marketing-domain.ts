"use client";

import { useParams } from "next/navigation";

export const MARKETING_DOMAIN = "dub.co";

export function useMarketingDomain() {
  const { domain } = useParams() as { domain?: string };
  return domain ?? MARKETING_DOMAIN;
}
