const ALLOWED_POST_AUTH_PREFIXES = [
  "/invite/",
  "/onboarding",
  "/dashboard",
  "/organizations/",
] as const;

export function getSafePostAuthRedirect(
  callbackUrl?: string | null,
): string | null {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return null;
  }

  const isAllowed = ALLOWED_POST_AUTH_PREFIXES.some(
    (prefix) => callbackUrl === prefix || callbackUrl.startsWith(prefix),
  );

  if (!isAllowed) {
    return null;
  }

  return callbackUrl;
}
