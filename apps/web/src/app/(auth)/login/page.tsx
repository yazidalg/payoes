import { Suspense } from "react";
import LoginPage from "./login-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-xl bg-muted" />}>
      <LoginPage />
    </Suspense>
  );
}
