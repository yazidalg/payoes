import { useCallback, useMemo, useState } from "react";

export type FieldValidationError = {
  field: string;
  message: string;
};

export type FieldValidator<TValues extends Record<string, unknown>> = {
  field: keyof TValues & string;
  validate: (values: TValues) => string | null;
};

export function validateFields<TValues extends Record<string, unknown>>(
  values: TValues,
  validators: FieldValidator<TValues>[],
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  for (const { field, validate } of validators) {
    const message = validate(values);

    if (message) {
      errors.push({ field, message });
    }
  }

  return errors;
}

export function getFirstValidationError(
  errors: FieldValidationError[],
): string | null {
  return errors[0]?.message ?? null;
}

export function errorsByField(
  errors: FieldValidationError[],
): Record<string, string> {
  return Object.fromEntries(errors.map(({ field, message }) => [field, message]));
}

export function useFormValidation<TValues extends Record<string, unknown>>(
  values: TValues,
  validators: FieldValidator<TValues>[],
) {
  return useMemo(() => {
    const errors = validateFields(values, validators);

    return {
      errors,
      firstError: getFirstValidationError(errors),
      isValid: errors.length === 0,
    };
  }, [values, validators]);
}

export function useSplitFormValidation<TValues extends Record<string, unknown>>(
  values: TValues,
  requiredValidators: FieldValidator<TValues>[],
  inlineValidators: FieldValidator<TValues>[],
) {
  return useMemo(() => {
    const requiredErrors = validateFields(values, requiredValidators);
    const inlineErrors = validateFields(values, inlineValidators);

    return {
      requiredErrors,
      firstRequiredError: getFirstValidationError(requiredErrors),
      isRequiredValid: requiredErrors.length === 0,
      inlineErrors,
      inlineErrorsByField: errorsByField(inlineErrors),
      hasInlineErrors: inlineErrors.length > 0,
      isValid: requiredErrors.length === 0 && inlineErrors.length === 0,
    };
  }, [values, requiredValidators, inlineValidators]);
}

export function useTouchedFields<TField extends string>() {
  const [touched, setTouched] = useState<Partial<Record<TField, boolean>>>({});

  const touch = useCallback((field: TField) => {
    setTouched((previous) =>
      previous[field] ? previous : { ...previous, [field]: true },
    );
  }, []);

  const resetTouched = useCallback(() => {
    setTouched({});
  }, []);

  return { touched, touch, resetTouched };
}

export function getVisibleInlineError(
  error: string | undefined,
  touched: boolean,
): string | undefined {
  if (!touched || !error) {
    return undefined;
  }

  return error;
}
