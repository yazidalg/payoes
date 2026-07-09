"use client";

import { Button, type ButtonProps, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";

type ValidatedSubmitButtonProps = Omit<ButtonProps, "disabledTooltip"> & {
  requiredError?: string | null;
  submitDisabled?: boolean;
};

export function ValidatedSubmitButton({
  requiredError,
  submitDisabled = false,
  loading,
  type,
  className,
  ...props
}: ValidatedSubmitButtonProps) {
  const isDisabled = Boolean(requiredError) || submitDisabled || loading;
  const showRequiredTooltip = Boolean(requiredError) && !loading;

  const button = (
    <Button
      {...props}
      className={cn("w-fit", className)}
      type={isDisabled ? "button" : (type ?? "submit")}
      loading={loading}
      disabled={isDisabled}
    />
  );

  const wrapped = (
    <span
      className={cn(
        "inline-flex w-fit",
        showRequiredTooltip && "cursor-not-allowed",
      )}
    >
      {button}
    </span>
  );

  if (showRequiredTooltip) {
    return <Tooltip content={requiredError}>{wrapped}</Tooltip>;
  }

  return wrapped;
}
