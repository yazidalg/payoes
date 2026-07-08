import { cn } from "@/lib/utils";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "organization", label: "Organization" },
] as const;

export type OnboardingStep = (typeof STEPS)[number]["id"];

export function OnboardingStepIndicator({
  currentStep,
}: {
  currentStep: OnboardingStep;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <ol className="flex w-full items-center gap-2">
      {STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isComplete && "bg-primary text-primary-foreground",
                    isCurrent && "border-2 border-primary text-primary",
                    !isComplete && !isCurrent && "border border-border text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-sm",
                    isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              <div
                className={cn(
                  "h-0.5 w-full rounded-full",
                  index < STEPS.length - 1 ? "block" : "hidden",
                  isComplete ? "bg-primary" : "bg-border"
                )}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
