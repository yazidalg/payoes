"use client";

import { authFormWrapperClass } from "@/ui/auth/auth-styles";
import { AnimatedSizeContainer } from "@dub/ui";
import { AuthMethodsSeparator } from "../auth-methods-separator";
import { SignUpEmail } from "./signup-email";
import { SignUpOAuth } from "./signup-oauth";

export const SignUpForm = ({
  methods = ["email", "google"],
}: {
  methods?: ("email" | "google")[];
}) => {
  return (
    <AnimatedSizeContainer height>
      <div className={authFormWrapperClass}>
        {methods.includes("email") ? <SignUpEmail /> : null}
        {methods.length > 1 ? <AuthMethodsSeparator /> : null}
        <SignUpOAuth methods={methods} />
      </div>
    </AnimatedSizeContainer>
  );
};
