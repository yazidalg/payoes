import { Suspense } from "react";
import AuthErrorPage from "./auth-error-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />
      }
    >
      <AuthErrorPage />
    </Suspense>
  );
}
