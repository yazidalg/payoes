import Link from "next/link";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { Logo } from "@/components/shared/logo";
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

      <div className="flex w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
          <Logo />
          <h3 className="text-lg font-medium">Create an organization</h3>
          <p className="-translate-y-2 text-balance text-center text-xs text-neutral-500">
            Set up a workspace to manage payments, customers, and your receiving
            wallet with your team.
          </p>
        </div>

        <CreateOrganizationForm
          className="bg-neutral-50 px-4 py-8 sm:px-16"
          defaultEmail={defaultEmail}
          redirectTo="/dashboard/payments"
        />
      </div>
    </div>
  );
}
