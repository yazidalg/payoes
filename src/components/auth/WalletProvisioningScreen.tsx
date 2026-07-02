"use client";

import { useAuth } from "./AuthProvider";

export default function WalletProvisioningScreen() {
  const { error, signOut } = useAuth();

  const steps = [
    "Verifying Google account",
    "Creating Turnkey MPC wallet",
    "Generating Stellar address (testnet)",
    "Funding account via Friendbot",
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f8] px-6">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e5e7eb] border-t-[#1a56db]" />
        </div>

        <h2 className="text-xl font-semibold text-[#111827]">
          Setting up your wallet
        </h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          Securing your Stellar testnet account with MPC
        </p>

        {error ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-xl bg-[#fef2f2] px-4 py-3 text-sm text-[#dc2626]">
              {error}
            </p>
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-2xl border border-[#e5e7eb] bg-white py-3 text-sm font-semibold text-[#111827]"
            >
              Keluar & coba lagi
            </button>
          </div>
        ) : (
          <ul className="mt-8 space-y-3 text-left">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm text-[#6b7280] shadow-sm"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e5e7eb] text-xs font-bold text-[#9ca3af]">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
