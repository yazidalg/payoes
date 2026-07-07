import { Suspense } from "react";
import RegisterPage from "./register-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-xl bg-muted" />}>
      <RegisterPage />
    </Suspense>
  );
}
