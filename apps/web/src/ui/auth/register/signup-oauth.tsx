"use client";

import { Button } from "@dub/ui";
import { Google } from "@dub/ui/icons";
import { signIn } from "next-auth/react";
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
        signIn("google", { callbackUrl: next });
      }}
      loading={clickedGoogle}
      icon={<Google className="h-4 w-4" />}
    />
  );
};
