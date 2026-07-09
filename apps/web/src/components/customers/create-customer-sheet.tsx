"use client";

import { useMemo, useState } from "react";
import {
  createCustomerInlineValidators,
  createCustomerRequiredValidators,
  type CreateCustomerFormValues,
} from "@/lib/validation/create-customer-validation";
import {
  getVisibleInlineError,
  useSplitFormValidation,
  useTouchedFields,
} from "@/lib/validation/form-validation";
import { FormFieldLabel } from "@/ui/forms/form-field-label";
import { FormInput } from "@/ui/forms/form-input";
import { FormTextarea } from "@/ui/forms/form-textarea";
import { ValidatedSubmitButton } from "@/ui/forms/validated-submit-button";
import { Button, Sheet } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import { toast } from "sonner";

type CreateCustomerSheetProps = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (customerId: string) => void;
};

type CreateCustomerField = keyof CreateCustomerFormValues;

export function CreateCustomerSheet({
  organizationId,
  open,
  onOpenChange,
  onCreated,
}: CreateCustomerSheetProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { touched, touch, resetTouched } =
    useTouchedFields<CreateCustomerField>();

  const formValues = useMemo<CreateCustomerFormValues>(
    () => ({
      name,
      email,
      wallet,
      notes,
    }),
    [name, email, wallet, notes],
  );

  const {
    firstRequiredError,
    inlineErrorsByField,
    hasInlineErrors,
    isValid,
  } = useSplitFormValidation(
    formValues,
    createCustomerRequiredValidators,
    createCustomerInlineValidators,
  );

  function resetForm() {
    setName("");
    setEmail("");
    setWallet("");
    setNotes("");
    setError(null);
    resetTouched();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleFieldChange(
    field: CreateCustomerField,
    value: string,
    setter: (value: string) => void,
  ) {
    touch(field);
    setter(value);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();

    if (!isValid) {
      return;
    }

    setError(null);
    setIsLoading(true);

    const response = await fetch(
      `/api/organizations/${organizationId}/customers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          primary_stellar_address: wallet.trim() || null,
          notes: notes.trim() || null,
        }),
      },
    );

    const data = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to create customer");
      setIsLoading(false);
      return;
    }

    toast.success("Customer created");
    resetForm();
    onOpenChange(false);
    onCreated?.(data.id ?? "");
    setIsLoading(false);
  }

  const nameError = getVisibleInlineError(
    inlineErrorsByField.name,
    Boolean(touched.name),
  );
  const emailError = getVisibleInlineError(
    inlineErrorsByField.email,
    Boolean(touched.email),
  );
  const walletError = getVisibleInlineError(
    inlineErrorsByField.wallet,
    Boolean(touched.wallet),
  );
  const notesError = getVisibleInlineError(
    inlineErrorsByField.notes,
    Boolean(touched.notes),
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <form onSubmit={(event) => void handleCreate(event)} className="flex h-full flex-col">
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50">
          <div className="flex h-16 items-center justify-between px-6 py-4">
            <div className="min-w-0">
              <Sheet.Title>Create customer</Sheet.Title>
              <Sheet.Description className="text-sm text-neutral-500">
                Add a payer profile you can link to future payments.
              </Sheet.Description>
            </div>
            <Sheet.Close asChild>
              <Button
                type="button"
                variant="outline"
                icon={<Xmark className="size-5" />}
                className="h-auto w-fit shrink-0 p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 p-5 sm:p-6">
            {error ? (
              <p className="text-xs font-medium text-red-600">{error}</p>
            ) : null}

            <div className="space-y-2">
              <FormFieldLabel htmlFor="create-customer-name" required>
                Name
              </FormFieldLabel>
              <FormInput
                id="create-customer-name"
                placeholder="Alice Johnson"
                value={name}
                error={nameError}
                onChange={(event) =>
                  handleFieldChange("name", event.target.value, setName)
                }
              />
            </div>

            <div className="space-y-2">
              <FormFieldLabel htmlFor="create-customer-email" required>
                Email
              </FormFieldLabel>
              <FormInput
                id="create-customer-email"
                type="email"
                placeholder="alice@example.com"
                value={email}
                error={emailError}
                onChange={(event) =>
                  handleFieldChange("email", event.target.value, setEmail)
                }
              />
            </div>

            <div className="space-y-2">
              <FormFieldLabel htmlFor="create-customer-wallet">
                Stellar wallet
              </FormFieldLabel>
              <FormInput
                id="create-customer-wallet"
                placeholder="G..."
                value={wallet}
                error={walletError}
                onChange={(event) =>
                  handleFieldChange("wallet", event.target.value, setWallet)
                }
              />
            </div>

            <div className="space-y-2">
              <FormFieldLabel htmlFor="create-customer-notes">Notes</FormFieldLabel>
              <FormTextarea
                id="create-customer-notes"
                rows={4}
                placeholder="VIP client, agency contact, etc."
                value={notes}
                error={notesError}
                onChange={(event) =>
                  handleFieldChange("notes", event.target.value, setNotes)
                }
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white p-5">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            />
            <ValidatedSubmitButton
              variant="primary"
              text="Create customer"
              loading={isLoading}
              requiredError={firstRequiredError}
              submitDisabled={hasInlineErrors}
              className="h-9"
            />
          </div>
        </div>
      </form>
    </Sheet>
  );
}
