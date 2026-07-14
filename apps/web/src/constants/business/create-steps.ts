export const CREATE_BUSINESS_STEPS = [
  {
    step: "business",
    stepNumber: 1,
    label: "Business",
  },
  {
    step: "settlement-wallet",
    stepNumber: 2,
    label: "Settlement wallet",
  },
] as const;

export type CreateBusinessStep =
  (typeof CREATE_BUSINESS_STEPS)[number]["step"];
