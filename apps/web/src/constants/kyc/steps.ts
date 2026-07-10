export const KYC_VERIFICATION_STEPS = [
  {
    step: "identity",
    stepNumber: 1,
    label: "Verify identity",
    href: "/verification/identity",
  },
  {
    step: "go-live",
    stepNumber: 2,
    label: "Go live",
    href: "/verification/go-live",
  },
  {
    step: "settlement-wallet",
    stepNumber: 3,
    label: "Settlement wallet",
    href: "/verification/settlement-wallet",
  },
] as const;

export type KycVerificationStep =
  (typeof KYC_VERIFICATION_STEPS)[number]["step"];
