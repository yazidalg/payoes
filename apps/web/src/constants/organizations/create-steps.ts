export const CREATE_ORGANIZATION_STEPS = [
  {
    step: "organization",
    stepNumber: 1,
    label: "Organization",
  },
  {
    step: "settlement-wallet",
    stepNumber: 2,
    label: "Settlement wallet",
  },
] as const;

export type CreateOrganizationStep =
  (typeof CREATE_ORGANIZATION_STEPS)[number]["step"];
