import Link from "next/link";
import { CreateOrganizationForm } from "@/components/onboarding/create-organization-form";
import { OnboardingStepIndicator } from "@/components/onboarding/onboarding-step-indicator";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export function CreateOrganizationScreen({
  defaultEmail,
  backHref,
  backLabel = "Back",
  showStepIndicator = false,
}: {
  defaultEmail?: string | null;
  backHref: string;
  backLabel?: string;
  showStepIndicator?: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6">
      {showStepIndicator ? (
        <OnboardingStepIndicator currentStep="organization" />
      ) : null}

      <Button
        variant="ghost"
        size="sm"
        className="-mb-2 w-fit gap-2 self-start text-muted-foreground"
        render={<Link href={backHref} />}
      >
        <ArrowLeftIcon className="size-4" />
        {backLabel}
      </Button>

      <CreateOrganizationForm defaultEmail={defaultEmail} />
    </div>
  );
}
