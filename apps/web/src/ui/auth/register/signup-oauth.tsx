"use client";

import { getApiBaseUrl } from "@/lib/api-client";
import { Button } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const SignUpOAuth = ({
  methods,
}: {
  methods: ("email" | "google")[];
}) => {
  const searchParams = useSearchParams();
  const next = searchParams.get("callbackUrl") ?? "/onboarding";
  const [clickedGoogle, setClickedGoogle] = useState(false);

  useEffect(() => {
    return () => {
      setClickedGoogle(false);
    };
  }, []);

  if (!methods.includes("google")) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      text="Continue with Google"
      onClick={() => {
        setClickedGoogle(true);
        const url = new URL(`${getApiBaseUrl()}/api/auth/google`);
        url.searchParams.set("callbackUrl", next);
        window.location.href = url.toString();
      }}
      loading={clickedGoogle}
      icon={<Google className="h-4 w-4" />}
    />
  );
};
