export function getHubPathAfterOrganizationSwitch(pathname: string): string | null {
  if (
    /^\/dashboard\/payments\/[^/]+$/.test(pathname) &&
    pathname !== "/dashboard/payments/invoices" &&
    pathname !== "/dashboard/payments/links" &&
    !pathname.startsWith("/dashboard/payments/invoices/") &&
    !pathname.startsWith("/dashboard/payments/links/") &&
    !pathname.startsWith("/dashboard/payments/checkout-sessions/")
  ) {
    return "/dashboard/payments";
  }

  if (/^\/dashboard\/customers\/[^/]+$/.test(pathname)) {
    return "/dashboard/customers";
  }

  if (
    /^\/dashboard\/payments\/invoices\/[^/]+$/.test(pathname) &&
    !pathname.endsWith("/print") &&
    !pathname.endsWith("/new")
  ) {
    return "/dashboard/payments?tab=invoices";
  }

  if (
    /^\/dashboard\/payments\/links\/[^/]+$/.test(pathname) &&
    !pathname.endsWith("/new")
  ) {
    return "/dashboard/payments?tab=payment-links";
  }

  if (/^\/dashboard\/payments\/checkout-sessions\/[^/]+$/.test(pathname)) {
    return "/dashboard/payments?tab=checkout-sessions";
  }

  if (/^\/dashboard\/developers\/webhooks\/[^/]+$/.test(pathname)) {
    return "/dashboard/developers/webhooks";
  }

  if (/^\/dashboard\/developers\/webhooks\/[^/]+\/edit$/.test(pathname)) {
    return `/dashboard/developers/webhooks/${pathname.split("/")[4]}`;
  }

  if (/^\/dashboard\/developers\/api-keys\/[^/]+$/.test(pathname)) {
    return "/dashboard/developers/api-keys";
  }

  return null;
}
