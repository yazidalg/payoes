import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginPage from "./login-page";

const OAUTH_CANCEL_ERRORS = new Set([
  "OAuthCallbackError",
  "OAuthCallback",
  "AccessDenied",
]);

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { error } = await searchParams;

  if (error && OAUTH_CANCEL_ERRORS.has(error)) {
    redirect(`/auth/error?error=${encodeURIComponent(error)}`);
  }

  return (
    <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-xl bg-muted" />}>
      <LoginPage />
    </Suspense>
  );
}
