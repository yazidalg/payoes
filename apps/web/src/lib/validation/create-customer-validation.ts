import { isValidStellarAddress } from "@/lib/stellar/validate-address";
import type { FieldValidator } from "./form-validation";

export type CreateCustomerFormValues = {
  name: string;
  email: string;
  wallet: string;
  notes: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createCustomerRequiredValidators: FieldValidator<CreateCustomerFormValues>[] =
  [
    {
      field: "name",
      validate: (values) =>
        values.name.trim() ? null : "Name is required",
    },
    {
      field: "email",
      validate: (values) =>
        values.email.trim() ? null : "Email is required",
    },
  ];

export const createCustomerInlineValidators: FieldValidator<CreateCustomerFormValues>[] =
  [
    {
      field: "name",
      validate: (values) => {
        const name = values.name.trim();

        if (!name) {
          return null;
        }

        if (name.length > 200) {
          return "Name must be 200 characters or less";
        }

        return null;
      },
    },
    {
      field: "email",
      validate: (values) => {
        const email = values.email.trim();

        if (!email) {
          return null;
        }

        if (!emailPattern.test(email)) {
          return "Email must be a valid email address";
        }

        return null;
      },
    },
    {
      field: "wallet",
      validate: (values) => {
        const wallet = values.wallet.trim();

        if (!wallet) {
          return null;
        }

        if (!isValidStellarAddress(wallet)) {
          return "Stellar wallet must be a valid address";
        }

        return null;
      },
    },
    {
      field: "notes",
      validate: (values) => {
        if (values.notes.length > 2000) {
          return "Notes must be 2000 characters or less";
        }

        return null;
      },
    },
  ];
