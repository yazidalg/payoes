type Step = { title: string; description: string };

const DEFAULT_STEPS: Step[] = [
  {
    title: "Create a payment",
    description: "One API call returns a payment and a hosted checkout URL.",
  },
  {
    title: "Customer pays",
    description:
      "They open the checkout page, connect any Stellar wallet, and approve. No account needed.",
  },
  {
    title: "Settled and notified",
    description:
      "Payoes verifies the payment on-chain, settles to your wallet, and fires a webhook.",
  },
];

/* Typographic replacement for the old code sample: a designed, plain-English
   flow of what one payment does, no code. */
export function StepFlow({
  title = "How one payment works",
  steps = DEFAULT_STEPS,
}: {
  /* Pass null to hide the card header, e.g. when a section heading already
     labels the flow. */
  title?: string | null;
  steps?: Step[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
      {title && (
        <div className="flex items-center gap-2 border-b border-neutral-100 px-6 py-4">
          <span className="size-2 rounded-full bg-primary" />
          <p className="text-sm font-medium text-neutral-900">{title}</p>
        </div>
      )}
      <ol className="relative flex flex-col px-6 py-2">
        {steps.map((step, index) => (
          <li
            key={step.title}
            style={{
              animationDelay: `${index * 120}ms`,
              animationFillMode: "both",
            }}
            className="group animate-slide-up-fade relative flex gap-4 py-4 [--offset:8px] [animation-duration:700ms]"
          >
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute left-4 top-12 h-[calc(100%-1rem)] w-px -translate-x-1/2 bg-neutral-200"
              />
            )}
            <div className="font-display relative z-10 flex size-8 flex-none items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-110">
              {index + 1}
            </div>
            <div className="pt-1">
              <p className="text-sm font-medium text-neutral-900">
                {step.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
