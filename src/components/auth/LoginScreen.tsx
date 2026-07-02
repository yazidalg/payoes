"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function LoginScreen() {
  const { error } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f8]">
      <div className="h-11 shrink-0" />

      <div className="flex flex-1 flex-col justify-between px-6 pb-10 pt-16">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a56db] text-2xl font-bold text-white shadow-lg shadow-[#1a56db]/25">
            P
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
            Payoes
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[#6b7280]">
            Digital banking powered by stablecoins.
            <br />
            Simple, secure, global.
          </p>
        </div>

        <div className="space-y-4">
          {error && (
            <p className="rounded-xl bg-[#fef2f2] px-4 py-3 text-center text-sm text-[#dc2626]">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#e5e7eb] bg-white py-4 text-base font-semibold text-[#111827] shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            <GoogleIcon />
            {loading ? "Redirecting..." : "Continue with Google"}
          </button>

          <p className="text-center text-xs leading-relaxed text-[#9ca3af]">
            Your Stellar wallet is secured with Turnkey MPC.
            <br />
            No seed phrase needed.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
