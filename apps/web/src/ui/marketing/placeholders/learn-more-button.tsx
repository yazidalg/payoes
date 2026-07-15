"use client";

import { createHref } from "@dub/utils";
import { useMarketingDomain } from "@/ui/marketing/use-marketing-domain";
import { ButtonLink } from "./button-link";

export function LearnMoreButton({
  utmParams,
}: {
  utmParams: Record<string, string>;
}) {
  const domain = useMarketingDomain();
  return (
    <ButtonLink
      variant="secondary"
      href={createHref("/links", domain, {
        ...utmParams,
        utm_campaign: domain,
        utm_content: "Learn more",
      })}
    >
      Learn more
    </ButtonLink>
  );
}
