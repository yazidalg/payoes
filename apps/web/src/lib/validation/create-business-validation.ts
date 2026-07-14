import type { FieldValidator } from "./form-validation";

export type CreateBusinessFormValues = {
  name: string;
  email: string;
  website: string;
  description: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const websitePattern = /^https?:\/\/.+/i;

export const createBusinessRequiredValidators: FieldValidator<CreateBusinessFormValues>[] =
  [
    {
      field: "name",
      validate: (values) =>
        values.name.trim() ? null : "Business name is required",
    },
    {
      field: "email",
      validate: (values) =>
        values.email.trim() ? null : "Business email is required",
    },
  ];

export const createBusinessInlineValidators: FieldValidator<CreateBusinessFormValues>[] =
  [
    {
      field: "name",
      validate: (values) => {
        const name = values.name.trim();

        if (!name) {
          return null;
        }

        if (name.length > 120) {
          return "Business name must be 120 characters or less";
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
      field: "website",
      validate: (values) => {
        const website = values.website.trim();

        if (!website) {
          return null;
        }

        if (website.length > 200) {
          return "Website must be 200 characters or less";
        }

        if (!websitePattern.test(website)) {
          return "Website must be a valid URL";
        }

        return null;
      },
    },
    {
      field: "description",
      validate: (values) => {
        if (values.description.length > 500) {
          return "Description must be 500 characters or less";
        }

        return null;
      },
    },
  ];
